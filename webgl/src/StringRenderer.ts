module spine.webgl {
	class Renderable {
		constructor(public vertices: ArrayLike<number>, public numVertices: number, public numFloats: number) {}
	};

	export class StringRenderer {
		static QUAD_TRIANGLES = [0, 3, 2, 0, 2, 1];
		private vertices:ArrayLike<number>;
		private vertexSize = 2 + 2 + 4;
		private twoColorTint = false;
		private renderable: Renderable = new Renderable(null, 0, 0);
		private canvasTexture : GLTexture;
		private textCanvas : HTMLCanvasElement;
		private colorCanvas : HTMLCanvasElement;
		private colorShader : CanvasRenderingContext2D;
		private textShader : CanvasRenderingContext2D;
		private cache_text : {text : string, text_data : TextRenderingData}={
			text:"",
			text_data:new TextRenderingData,
		};
		constructor (private context: ManagedWebGLRenderingContext, twoColorTint: boolean = true) {
			
			this.colorCanvas = document.createElement('canvas');
			
			this.colorCanvas.height = this.colorCanvas.width = 1;
			this.colorShader = this.colorCanvas.getContext('2d');

			this.textCanvas = document.createElement('canvas');
			this.textShader = this.textCanvas.getContext('2d');
			this.canvasTexture = new GLTexture(context.gl,this.textCanvas as any as ImageBitmap);

			this.twoColorTint = twoColorTint;
			if (twoColorTint)
				this.vertexSize += 4;
			this.vertices = Utils.newFloatArray(this.vertexSize * 12);
		}

		colorToRGBA(color : string | CanvasGradient | CanvasPattern) : number[] {
			this.colorShader.fillStyle = color;
			this.colorShader.fillRect(0, 0, 1, 1);
			var result : number[]=[];
			this.colorShader.getImageData(0, 0, 1, 1).data.map(x=>result.push(x/255.0));
			return result;
		}
		private static getPowerOfTwo(value : number, pow : number = 1) {
			let _pow = pow || 1;
			while(_pow<value) {
				_pow *= 2;
			}
			return _pow;
		}
		private measureText(textToMeasure : string) : number {
			return this.textShader.measureText(textToMeasure).width;
		}
		private createMultilineText(textToWrite : string, maxWidth : number, text : string[]) : number {
			textToWrite = textToWrite.replace("\n"," ");
			var currentText : string = textToWrite;
			var futureText;
			var subWidth = 0;
			var maxLineWidth = 0;
	
			var wordArray = textToWrite.split(" ");
			var wordsInCurrent, wordArrayLength;
			wordsInCurrent = wordArrayLength = wordArray.length;
	
			// Reduce currentText until it is less than maxWidth or is a single word
			// futureText var keeps track of text not yet written to a text line
			while (this.measureText(currentText) > maxWidth && wordsInCurrent > 1) {
				wordsInCurrent--;
				var linebreak = false;
	
				currentText = futureText = "";
				for(var i = 0; i < wordArrayLength; i++) {
					if (i < wordsInCurrent) {
						currentText += wordArray[i];
						if (i+1 < wordsInCurrent) { currentText += " "; }
					}
					else {
						futureText += wordArray[i];
						if(i+1 < wordArrayLength) { futureText += " "; }
					}
				}
			}
			text.push(currentText); // Write this line of text to the array
			maxLineWidth = this.measureText(currentText);
	
			// If there is any text left to be written call the function again
			if(futureText) {
				subWidth = this.createMultilineText(futureText, maxWidth, text);
				if (subWidth > maxLineWidth) {
					maxLineWidth = subWidth;
				}
			}
	
			// Return the maximum line width
			return maxLineWidth;
		}

		private drawText(textToWrite : string, mWidth : number, 
			squareTexture : boolean, textHeight : number, textAlignment : CanvasTextAlign, 
			textColor : string | CanvasGradient | CanvasPattern, 
			fontFamily : string, backgroundColour : string | CanvasGradient | CanvasPattern, 
			output_data : TextRenderingData
		) {
			let ctx = this.textShader;
			let canvasTexture = this.textCanvas;
			var canvasX, canvasY;
			var textX, textY;
			if(output_data == void 0)output_data=new TextRenderingData();
			var text : string[] = [];


			var maxWidth = mWidth;

			ctx.font = textHeight+"px "+fontFamily;
			var real_width=maxWidth;
			if (maxWidth && this.measureText(textToWrite) > maxWidth ) {
				maxWidth = this.createMultilineText(textToWrite, maxWidth, text);
				real_width=maxWidth;
				canvasX = StringRenderer.getPowerOfTwo(maxWidth);
			} else {
				text.push(textToWrite);
				real_width=ctx.measureText(textToWrite).width;
				canvasX = StringRenderer.getPowerOfTwo(real_width);
			}

			canvasY = StringRenderer.getPowerOfTwo(textHeight*(text.length+1));
			if(squareTexture) {
				(canvasX > canvasY) ? canvasY = canvasX : canvasX = canvasY;
			}

			canvasTexture.width = canvasX;
			canvasTexture.height = canvasY;
			output_data.TextWidth=real_width;
			output_data.TextHeight=textHeight*(text.length+0.2);
			output_data.width=canvasX;
			output_data.height=canvasY;
			switch(textAlignment) {
				case "left":
					textX = 0;
					break;
				case "center":
					textX = canvasX/2;
					break;
				case "right":
					textX = canvasX;
					break;
				default:
					textX = canvasX/2;
					break;
			}
			textY = canvasY/2;

			ctx.fillStyle = backgroundColour;
			ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

			ctx.fillStyle = textColor;
			ctx.textAlign = textAlignment;

			ctx.textBaseline = 'middle'; // top, middle, bottom
			ctx.font = textHeight+"px "+fontFamily;

			var offset = (canvasY - textHeight*(text.length+1)) * 0.5;

			for(var i = 0; i < text.length; i++) {
				if(text.length > 1) {
					textY = (i+1)*textHeight + offset;
				}
				ctx.fillText(text[i], textX,  textY);
			}
		}

		draw (batcher: PolygonBatcher, characters : string, font : string = 'monospace', 
			scale : number = 1, x_pos : number = 0, y_pos : number = 0,
			textColor : string | CanvasGradient | CanvasPattern = '#000', 
			textHeight : number = 128, maxWidth : number = 512, res : number = 4
		) {
			var draw_font : string=font;
			if(font.toString().replace(/^[\s\uFEFF\xA0\n\r]+|[\s\uFEFF\xA0\n\r]+$/g,'')=='')draw_font='monospace';
			let output_data : TextRenderingData=new TextRenderingData();
			let inv_res = 1/res;
			if(this.cache_text.text!=characters){
				this.drawText(characters, maxWidth*res, false, textHeight*res, 'center', textColor, draw_font, 'transparent',output_data);
				this.cache_text.text=characters;
				this.cache_text.text_data=output_data;
				this.canvasTexture.restore();
			}else{
				output_data=this.cache_text.text_data;
			}
			
			var full_width = 0.5/output_data.width;
			var t_left = full_width*(output_data.width-output_data.TextWidth);
			var t_right = full_width*(output_data.width+output_data.TextWidth);
			var t_width = output_data.TextWidth*0.01*inv_res;
			var full_height = 0.5/output_data.height;
			var t_bottom = full_height*(output_data.height-output_data.TextHeight);
			var t_top = full_height*(output_data.height+output_data.TextHeight);
			var t_height = output_data.TextHeight*0.01*inv_res;

			let renderable: Renderable = this.renderable;

			let point_list : {x:number,y:number}[]=[];
			let tex_list : {x:number,y:number}[]=[];

			//convert from GLUT
			//gl.Begin(gl.QUADS);
				//gl.TexCoord(t_left,t_bottom);
				tex_list.push({x:t_left,y:t_bottom});
				//gl.Vertex(0,0,0);
				point_list.push({x:0,y:t_height});
				
				//gl.TexCoord(t_right,t_bottom);
				tex_list.push({x:t_right,y:t_bottom});
				//gl.Vertex(t_width,0,0);
				point_list.push({x:t_width,y:t_height});

				//gl.TexCoord(t_right,t_top);
				tex_list.push({x:t_right,y:t_top});
				//gl.Vertex(t_width,t_height,0);
				point_list.push({x:t_width,y:0});
				
				//gl.TexCoord(t_left,t_top);
				tex_list.push({x:t_left,y:t_top});
				//gl.Vertex(0,t_height,0);
				point_list.push({x:0,y:0});
			//gl.End();

			let twoColorTint = this.twoColorTint;
		
			renderable.vertices = this.vertices;
			renderable.numVertices = 4;
			renderable.numFloats = renderable.numVertices * this.vertexSize;

			let verts = renderable.vertices;
			for (let v = 0, u=0, n = renderable.numFloats; v < n; v += this.vertexSize, ++u) {
				verts[v] = x_pos + point_list[u].x * scale;
				verts[v + 1] = y_pos + point_list[u].y * scale;
				verts[v + 2] = verts[v + 3] = verts[v + 4] = verts[v + 5] = 1;
				verts[v + 6] = tex_list[u].x;
				verts[v + 7] = tex_list[u].y;
				if(twoColorTint){
					verts[v + 8] = verts[v + 9] = verts[v + 10] = 0;
					verts[v + 11] = 1;
				}
			}
			let view = (renderable.vertices as Float32Array).subarray(0, renderable.numFloats);
			batcher.draw(this.canvasTexture, view, StringRenderer.QUAD_TRIANGLES); 

		}
	}

	class TextRenderingData{
		TextWidth : number;
		TextHeight : number;
		width : number;
		height : number;
	}
}
