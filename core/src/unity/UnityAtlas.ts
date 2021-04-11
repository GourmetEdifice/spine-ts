module spine {
	export class UnityAtlas {
		public atlasList : UnityAtlasItem[];
		public atlasMap : { [name: string]: number } = {};
		public texture : any;
		public file_name : string = '';
		constructor (input: any) {
			let atlasData : UnityAtlasData = input as UnityAtlasData;
			this.atlasList = [];
			for(let i=0; i<atlasData.mSprites.length; ++i){
				this.atlasList[i] = UnityAtlasItem.fromJSON(atlasData.mSprites[i]);
				this.atlasMap[this.atlasList[i].name] = i;
			}
		}
		public getMesh(name : string, width : number = -1, height : number = -1, 
			start_x : number = 0, start_y : number = 0,
			scale_x : number = 1, scale_y : number = 1,
			flip_x : boolean = false, flip_y : boolean = true) : AtlasTextureMesh{
			if(this.atlasMap[name] || this.atlasMap[name]==0){
				let result : AtlasTextureMesh = UnityAtlasItem.fromJSON(this.atlasList[this.atlasMap[name]]).
				getMesh(
					width, height,
					start_x, start_y, scale_x, scale_y,
					flip_x, flip_y
				);
				result.texture = this.texture;
				return result;
			}else{
				let file_message = '';
				if(this.file_name.trim() != '')file_message += ` in '${this.file_name}'`;
				throw new Error(`Atlas '${name}' not found${file_message}!`);
			}
		}
		public static load(
			loader: AssetManager,
			json_path: string,
			texture_path: string,
			success: (path_json: string, path_texture: string, atlas: UnityAtlas) => void = null,
			error: (path_json: string, path_texture: string, error: string) => void = null
		){

			loader.loadText(json_path,
				(path: string, atlasData: string): void => {
					loader.loadTexture(texture_path, (imagePath: string, _: HTMLImageElement) => {
						try {
							let result = new UnityAtlas(JSON.parse(atlasData));
							result.texture = loader.get(texture_path);
							result.file_name = json_path;
							if (success) success(json_path, texture_path, result);
						} catch (exception) {
							if (error) error(json_path, texture_path, `Couldn't load texture ${imagePath}`);
						}
					}, (imagePath: string, errorMessage: string) => {
						if (error) error(json_path, texture_path, `Couldn't load texture ${imagePath}`);
					})
				},
				(path: string, responseText: string): void => {
					if (error) error(json_path, texture_path, `Couldn't load js atlas ${json_path}: status ${status}, ${responseText}`);
				}
			);

		}
	}
	export class UnityFileData {
		public m_FileID : number;
		public m_PathID : number;
	}
	export class UnityAtlasItem {
		public name : string;
		public x : number;
		public y : number;
		public width : number;
		public height : number;
		
		public borderLeft : number;
		public borderRight : number;
		public borderTop : number;
		public borderBottom : number;
		
		public paddingLeft : number;
		public paddingRight : number;
		public paddingTop : number;
		public paddingBottom : number;

		public texture : any;
		//load from JSON will lose prototype functions.
		public static fromJSON(input : UnityAtlasItem) : UnityAtlasItem{
			var _this=new UnityAtlasItem();
			_this.name = input.name;
			_this.x = input.x;
			_this.y = input.y;
			_this.width = input.width;
			_this.height = input.height;
			
			_this.borderLeft = input.borderLeft;
			_this.borderRight = input.borderRight;
			_this.borderTop = input.borderTop;
			_this.borderBottom = input.borderBottom;
			
			_this.paddingLeft = input.paddingLeft;
			_this.paddingRight = input.paddingRight;
			_this.paddingTop = input.paddingTop;
			_this.paddingBottom = input.paddingBottom;
			return _this;
		}
		public getMesh(input_width:number = -1, input_height:number = -1, 
			_start_x : number = 0, _start_y : number = 0,
			_scale_x : number = 1, _scale_y : number = 1,
			_flip_x : boolean = false, _flip_y : boolean = true
		){
			const _width = input_width<=0 ? this.width : input_width;
			const _height = input_height<=0 ? this.height : input_height;
			let x_data : TexturePos[] = [
				new TexturePos(new PointPos(0,0),new PointPos(this.x,0)),
				new TexturePos(new PointPos(_width,0),new PointPos(this.x+this.width,0))
			];
			let y_data : TexturePos[] = [
				new TexturePos(new PointPos(0,0),new PointPos(0,this.y)),
				new TexturePos(new PointPos(0,_height),new PointPos(0,this.y+this.height))
			];
			//if(this.borderLeft || this.borderRight){
				let border_width = this.borderLeft + this.paddingLeft + this.borderRight + this.paddingRight;
				let middle_width = this.width - border_width;
				let _middle_width = _width - border_width;
				let middle_count =Math.floor(_middle_width / middle_width);
				if(_middle_width > 0 && middle_count > 0){
					x_data = [];
					let _middle_item_width = _middle_width/middle_count;
					let iterator_mesh = 0;
					let iterator_tex = this.x;
					if(this.paddingLeft > 0)x_data.push(
						new TexturePos(new PointPos(iterator_mesh,0),new PointPos(iterator_tex,0)),
						new TexturePos(new PointPos(iterator_mesh+=this.paddingLeft,0),new PointPos(iterator_tex+=this.paddingLeft,0))
					);
					if(this.borderLeft > 0)x_data.push(
						new TexturePos(new PointPos(iterator_mesh,0),new PointPos(iterator_tex,0)),
						new TexturePos(new PointPos(iterator_mesh+=this.borderLeft,0),new PointPos(iterator_tex+=this.borderLeft,0))
					);
					for(let i=0; i<middle_count; ++i){
						x_data.push(
							new TexturePos(new PointPos(iterator_mesh,0),new PointPos(iterator_tex,0)),
							new TexturePos(new PointPos(iterator_mesh+=_middle_item_width,0),new PointPos(iterator_tex+middle_width,0))
						);
					}
					iterator_tex+=middle_width;
					if(this.borderRight > 0)x_data.push(
						new TexturePos(new PointPos(iterator_mesh,0),new PointPos(iterator_tex,0)),
						new TexturePos(new PointPos(iterator_mesh+=this.borderRight,0),new PointPos(iterator_tex+=this.borderRight,0))
					);
					if(this.paddingRight > 0)x_data.push(
						new TexturePos(new PointPos(iterator_mesh,0),new PointPos(iterator_tex,0)),
						new TexturePos(new PointPos(iterator_mesh+=this.paddingRight,0),new PointPos(iterator_tex+=this.paddingRight,0))
					);
				}
			//}
			//if(this.borderTop || this.borderBottom){
				let border_height = this.borderTop + this.paddingTop + this.borderBottom + this.paddingBottom;
				let middle_height = this.height - border_height;
				let _middle_height = _height - border_height;
				let middle_y_count = Math.floor(_middle_height / middle_height);
				if(_middle_height > 0 && middle_y_count > 0){
					y_data = [];
					let _middle_item_height = _middle_height/middle_y_count;
					let iterator_mesh = 0;
					let iterator_tex = this.y;
					if(this.paddingTop > 0)y_data.push(
						new TexturePos(new PointPos(0,iterator_mesh),new PointPos(0,iterator_tex)),
						new TexturePos(new PointPos(0,iterator_mesh+=this.paddingTop),new PointPos(0,iterator_tex+=this.paddingTop))
					);
					if(this.borderTop > 0)y_data.push(
						new TexturePos(new PointPos(0,iterator_mesh),new PointPos(0,iterator_tex)),
						new TexturePos(new PointPos(0,iterator_mesh+=this.borderTop),new PointPos(0,iterator_tex+=this.borderTop))
					);
					for(let i=0; i<middle_y_count; ++i){
						y_data.push(
							new TexturePos(new PointPos(0,iterator_mesh),new PointPos(0,iterator_tex)),
							new TexturePos(new PointPos(0,iterator_mesh+=_middle_item_height),new PointPos(0,iterator_tex+middle_height))
						);
					}
					iterator_tex+=middle_height;
					if(this.borderBottom > 0)y_data.push(
						new TexturePos(new PointPos(0,iterator_mesh),new PointPos(0,iterator_tex)),
						new TexturePos(new PointPos(0,iterator_mesh+=this.borderBottom),new PointPos(0,iterator_tex+=this.borderBottom))
					);
					if(this.paddingBottom > 0)y_data.push(
						new TexturePos(new PointPos(0,iterator_mesh),new PointPos(0,iterator_tex)),
						new TexturePos(new PointPos(0,iterator_mesh+=this.paddingBottom),new PointPos(0,iterator_tex+=this.paddingBottom))
					);
				}
			//}
			let result_data : AtlasTextureMesh = new AtlasTextureMesh();
			result_data.vertex=[];
			for(let _y=0; _y<y_data.length; ++_y){
				for(let _x=0; _x<x_data.length; ++_x){
					let result_x = _flip_x?this.width-x_data[_x].meshPosition.x:x_data[_x].meshPosition.x;
					let result_y = _flip_y?this.height-y_data[_y].meshPosition.y:y_data[_y].meshPosition.y;
					result_data.vertex.push(
						new TexturePos(new PointPos(
							_start_x + result_x * _scale_x,
							_start_y + result_y * _scale_y
						),new PointPos(
							x_data[_x].texturePosition.x,
							y_data[_y].texturePosition.y
						))
					);
				}
			}

			result_data.index=[];
			for(let _y=0; _y<y_data.length / 2; ++_y){
				for(let _x=0; _x<x_data.length / 2; ++_x){
					let index = _y * x_data.length * 2 + _x * 2;
					let index2 = index + x_data.length;
					result_data.index.push(
						index, index2+1, index+1,
						index, index2, index2+1,
					);
				}
			}
			result_data.texture = this.texture;
			result_data.width = _width * _scale_x;
			result_data.height = _height * _scale_y;
			return result_data;
		}
	}
	class PointPos{
		constructor (public x : number, public y : number) {}
	}
	class TexturePos{
		constructor (public meshPosition : PointPos, public texturePosition : PointPos) {}
	}
	export class AtlasTextureMesh{
		public vertex : TexturePos[];
		public index : number[];
		public texture : any;
		public width : number;
		public height : number;
	}
	export class UnityAtlasData {
		public m_GameObject : UnityFileData;
		public m_Enabled : number;
		public m_Script : UnityFileData;
		public m_Name : string;
		public material : UnityFileData;
		public mSprites : UnityAtlasItem[];
	}
}