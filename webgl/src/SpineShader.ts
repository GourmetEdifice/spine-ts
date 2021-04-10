module spine.webgl {
	export class SpineShader extends spine.webgl.Shader {
		public name : string = '';

		public static built_in_code={
			vertex:{
				head_point:'',
				start_point:`
					attribute vec4 Shader.POSITION;
					attribute vec4 Shader.COLOR;
					#ifdef TWO_COLOR
						attribute vec4 Shader.COLOR2;
					#endif
					attribute vec2 Shader.TEXCOORDS;
					uniform mat4 Shader.MVP_MATRIX;
				`,
				end_point:'',
				tail_point:''
			},
			fragment:{
				head_point:`
					#ifdef GL_ES
						#define LOWP lowp
						precision mediump float;
					#else
						#define LOWP
					#endif
					#ifndef ALPHA_TESTING
						#define ALPHA_TESTING 1e-3
					#endif
					uniform sampler2D Shader.SAMPLER;
				`,
				start_point:'',
				end_point:'',
				tail_point:'if(gl_FragColor.a<ALPHA_TESTING)discard;'
			}
		}

		//enum not support this. https://stackoverflow.com/questions/64145849/
		/*
		enum SpineGLSLVars {
			MVP_MATRIX = Shader.MVP_MATRIX,
			POSITION = Shader.POSITION,
			COLOR = Shader.COLOR,
			COLOR2 = Shader.COLOR2,
			TEXCOORDS = Shader.TEXCOORDS,
			SAMPLER = Shader.SAMPLER
		}
		*/
		public static shader_vars : string[] = [//for 'for loop' iterator.
			'MVP_MATRIX',
			'POSITION',
			'COLOR',
			'COLOR2',
			'TEXCOORDS',
			'SAMPLER'
		];
		public static shader_var_names : string[] = [//for 'for loop' iterator.
			Shader.MVP_MATRIX,
			Shader.POSITION,
			Shader.COLOR,
			Shader.COLOR2,
			Shader.TEXCOORDS,
			Shader.SAMPLER
		];
		private static shader_vars_inv_lookup_data : any = {}; //pseudo-enum
		private static shader_vars_inv_lookup() : any {
			if(SpineShader.shader_vars_inv_lookup_data[SpineShader.shader_vars[0]])
				return SpineShader.shader_vars_inv_lookup_data;
			SpineShader.shader_vars_inv_lookup_data = {};
			for(var i=0; i<SpineShader.shader_vars.length; ++i){
				let shader_vars_name = (Shader as any)[SpineShader.shader_vars[i]];
				let enum_name = SpineShader.shader_vars[i];
				SpineShader.shader_vars_inv_lookup_data[enum_name] = shader_vars_name;
				SpineShader.shader_vars_inv_lookup_data[shader_vars_name] = enum_name;
			}
			return SpineShader.shader_vars_inv_lookup_data;
		}


		public static spine_built_ins : string[] = [//must be a string
		'head_point','start_point','end_point','tail_point'
		];
		protected compile_message: ShaderMessage = {} as ShaderMessage;

		public static code_lineid(code: string, file_name: string){
			var norm_code = code.replace(/[\n\r]+/,'\n');
			var put_file_name = '';
			if(file_name){
				put_file_name=file_name;
				norm_code = norm_code.replace(/(\w+\s+)(main)(\s*\([\s\S]*\)\s*\{)/g,"$1 _$2 $3");
			}
			var lines = norm_code.split('\n');
			var final_code=''
			for(var i = 0;i < lines.length;i++)final_code +="@@#linedata,"+put_file_name+","+(i+1)+"\n"+lines[i]+"\n";
			return final_code;
		}
		protected processShader(type: number, source: string){
			let gl = this.context.gl;
			let type_str : string = (type==gl.VERTEX_SHADER)?'vertex':((type==gl.FRAGMENT_SHADER)?'fragment':'geometry');
			if(type_str == 'geometry')throw new Error("WebGL not support Geometry Shader yet.");
			this.name=(/#\s*define\s+SHADER_NAME\s+([^\n]+)\s*\n/im.exec(source)||[] as string[])[1]||this.name;
			//add line id for error handling
			var result=SpineShader.code_lineid(source.
				replace(/@/g,'$@').
				replace(/\/\/\s*#\s*linedata/g,'//#@linedata').
				replace(/(\w+\s+main\s*\([^\)]*\)\s*\{)/,"@@start_point@@$1@@end_point@@")
			,'').
			replace(/(\/\/#linedata,,\d+[\n\r]+)\s*(@@start_point@@)/m,"$2\n$1").
			replace(/\/\/[^\n]*\n/g,'\n').
			replace(/\/\*(.|\n)*?\*\//g,'').
			replace(/@@#[^\n]+\n\s*(?=@@#)/g,'').
			replace(/@@#/g,'//#');
			//check for attribute (spine can not define new (or user-defined) attribute variable.)
			if(/attribute\s*\w+\s*\w+/.test(result))
				throw new Error('spine shader not allow user-defined attribute variables.');
			//find main function to insert spine code.
			var pos=result.search(/(\w+\s+main\s*\([^\)]*\)\s*\{)/);
			var main_proto_str = result.match(/(\w+\s+main\s*\([^\)]*\)\s*\{)/)[0]
			var start_str = result.substr(0,pos);
			var end_str = result.substr(pos+main_proto_str.length);
			var end_pose = end_str.search(/(\w+\s+\w+\s*\([^\}]*\)\s*\{)/);
			if(end_pose<0)end_pose=end_str.length;
			var main_body_str = end_str.substr(0,end_pose);
			end_str = end_str.substr(end_pose);
			var main_end_pose = main_body_str.lastIndexOf("}");
			var main_end_str = main_body_str.substr(main_end_pose);
			main_body_str = main_body_str.substr(0,main_end_pose);
			result=`@@head_point@@${start_str}${main_proto_str}${main_body_str}@@tail_point@@${main_end_str}${end_str}`;
			for(var i=0; i<SpineShader.spine_built_ins.length; ++i){
				result=result.replace(
					new RegExp('@@\\s*'+SpineShader.spine_built_ins[i]+'\\s*@@','m'),
					'\n'+((SpineShader.built_in_code as any)[type_str] as any)[SpineShader.spine_built_ins[i]]+'\n'
				);
			}

			//put spine variable.
			result=result.replace(/(Shader)\s*\.\s*(\w+)/mg,(match:string, obj:string, member:string) : string =>{
				let real_member : any = (Shader as any)[member] || (SpineShader as any)[member] || (this as any)[member];
				if(real_member){
					if(typeof real_member === typeof '' && (real_member as string).indexOf('\n')<0)return real_member as string;
					if(typeof real_member === typeof true)return (!real_member)?'false':'true';
					if(typeof real_member === typeof 1)return String(real_member);
					return `${obj}_NOTSUPPORT_${(typeof real_member) as string}_${member}`;
				}
				return `${obj}_${member}`;
			});
			//result=result.replace(/(Shader)\s*\.\s*(\w+)/mg,'$1_$2');
			return result;
		}

		protected compileShader (type: number, source: string) {
			let error = "Couldn't compile shader: \n";
			try {
				let gl = this.context.gl;
				let shader_type_name : string = (type==gl.VERTEX_SHADER)?'vertex':((type==gl.FRAGMENT_SHADER)?'fragment':'geometry');
				//fix TypeError: this.compile_message is undefined
				this.compile_message = this.compile_message || ({} as ShaderMessage);
				let pros_code=source.replace(/[\n\r]+/g,'\n');
				let code_line=pros_code.split('\n');
				//change variables and syntax into GLSL for spine.
				let new_code : string = this.processShader(type, pros_code);
				let shader = gl.createShader(type);
				gl.shaderSource(shader, new_code);
				gl.compileShader(shader);
				//analyze compiler infolog.
				let lines = new_code.split('\n');
				let compiler_infolog = gl.getShaderInfoLog(shader);
				for(var i=0; i<SpineShader.shader_var_names.length; ++i){
					compiler_infolog = compiler_infolog.replace(
						SpineShader.shader_var_names[i],
						'Shader_'+SpineShader.shader_vars[i]
					);
				}
				compiler_infolog = compiler_infolog.replace(
					/'(Shader)_([^']+)'\s*\:\s*[Uu](ndeclared|NDECLARED)\s*[Ii](dentifier|DENTIFIER)/g,
					(match:string, obj:string, member:string) : string =>{
						let mem_data : string[] = member.split('_');
						let mem_flag : boolean = mem_data[0]=='NOTSUPPORT' && mem_data.length>2;
						let mem_type : string = (mem_flag ? mem_data[1] : '').trim();
						let mem_name : string = (mem_flag ? mem_data.slice(2) : mem_data).join('_');
						let syntax : string = `${obj}.${mem_name}`;
						let message : string = `'${obj}' has no member named '${mem_name}'`;
						if(mem_type != '')
							message = `javascript type '${mem_type}' not support in GLSL.`;
						if(shader_type_name == 'fragment' && /^(POSITION|COLOR|COLOR2|TEXCOORDS)$/.test(mem_name))
							message = 'attribute variable not allowed in fragment shader.';
						return `'${syntax}' : ${message}`;
					}
				);
				let errs = compiler_infolog.split('\n');
				interface ErrorElement {
					type: string;
					index: string;
					line: string;
					syntax: string;
					message: string;
				}
				let error_datas : ErrorElement[]=[];
				for(let i=0; i<errs.length; ++i){
					let err_ele : ErrorElement = {} as ErrorElement;
					let err_mem = errs[i].split(':');
					if(err_mem.length>1){
						err_ele.type=err_mem[0];
						err_ele.index=err_mem[1];
						err_ele.line=err_mem[2];
						err_ele.syntax=err_mem[3];
						err_ele.message='';
						for(let j=4;j<err_mem.length;++j){
							if(err_ele.message != '')err_ele.message+=':';
							err_ele.message+=err_mem[j];
						}
						error_datas[i]=err_ele;
					}
				}
				var error_norm_datas : ErrorMessageElement[]=[];
				for(var i=0; i<error_datas.length; ++i){
					var err_ele : ErrorMessageElement = new ErrorMessageElement();
					var line_info = lines[parseInt(error_datas[i].line)-2];
					var line_data = lines[parseInt(error_datas[i].line)-1];
					var check_line=/#linedata/.exec(line_info);
					if(check_line){
						var check_line_split = line_info.substring(check_line.index+10,line_info.length).split(',');
						err_ele.file=check_line_split[0].split(';');
						err_ele.line=parseInt(check_line_split[1]);
						err_ele.post_code=line_data;
						var code_line_check : string[];
						var code_offset=-1;
						code_line_check=code_line;
						if(code_line_check)err_ele.code=code_line_check[err_ele.line+code_offset];
					}else{
						//內部錯誤
					}
					err_ele.type=error_datas[i].type;
					err_ele.syntax=error_datas[i].syntax;
					err_ele.message=error_datas[i].message;
					err_ele.shader_type=`${shader_type_name} shader` + (((this.name||'').trim()!='')?`(${this.name})`:'')
					error_norm_datas[i]=err_ele;
				}
				(this.compile_message as any)[shader_type_name]
					=error_norm_datas;
				if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
					let error_message : string = '';
					for(let i=0; i<error_norm_datas.length; ++i){
						error_message += error_norm_datas[i] + '\n';
					}
					gl.deleteShader(shader);
					if (!gl.isContextLost()) throw new Error(error_message);
				}
				return shader;
			} catch (exception) {
				if((exception as Error).message){
					error += (exception as Error).message;
				}else{
					error += String(exception);
				}
				throw new Error(error);
			}
		}

		protected compileProgram (vs: WebGLShader, fs: WebGLShader) {
			let gl = this.context.gl;
			let program = gl.createProgram();
			gl.attachShader(program, vs);
			gl.attachShader(program, fs);
			gl.linkProgram(program);
			this.compile_message.link_info = gl.getProgramInfoLog(program);
			if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
				let error = "Couldn't compile shader program: " + gl.getProgramInfoLog(program);
				gl.deleteProgram(program);
				if (!gl.isContextLost()) throw new Error(error);
			}
			return program;
		}

	}

	class ShaderMessage {
		public vertex : ErrorMessageElement[];
		public fragment : ErrorMessageElement[];
		public link_info : string;
	}

	class ErrorMessageElement {
		public file : string[];
		public line : number;
		public post_code : string;
		public code : string;
		public type : string;
		public syntax : string;
		public message : string;
		public shader_type : string;
		public toString = () : string => {
			return (
`${this.type} : ${this.syntax} : ${this.message} [at ${this.line}, ${this.shader_type}]
${this.code}`);
		}
	}

}
