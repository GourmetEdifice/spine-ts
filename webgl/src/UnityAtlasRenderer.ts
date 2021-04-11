module spine.webgl {
	class Renderable {
		constructor(public vertices: ArrayLike<number>, public numVertices: number, public numFloats: number) {}
	};

	export class UnityAtlasRenderer {
		private vertices:ArrayLike<number>;
		private vertexSize = 2 + 2 + 4;
		private twoColorTint = false;
		private renderable: Renderable = new Renderable(null, 0, 0);

		constructor (context: ManagedWebGLRenderingContext, twoColorTint: boolean = true) {
			this.twoColorTint = twoColorTint;
			if (twoColorTint)
				this.vertexSize += 4;
			this.vertices = Utils.newFloatArray(this.vertexSize * 1024);
		}

		draw (batcher: PolygonBatcher, atlasItem:spine.AtlasTextureMesh, input_texture: GLTexture = null) {
			let renderable: Renderable = this.renderable;
			let triangles: Array<number> = null;
			let twoColorTint = this.twoColorTint;
			let texture : GLTexture = input_texture;
			if(atlasItem.texture instanceof GLTexture)texture = input_texture || (atlasItem.texture as GLTexture);
			if (texture != null) {
				let img = texture.getImage();
				this.vertices = Utils.newFloatArray(this.vertexSize * atlasItem.vertex.length);
				renderable.vertices = this.vertices;
				renderable.numVertices = atlasItem.vertex.length;
				renderable.numFloats = renderable.numVertices * this.vertexSize;
				if (renderable.numFloats > renderable.vertices.length) {
					renderable.vertices = this.vertices = spine.Utils.newFloatArray(renderable.numFloats);
				}
				triangles=atlasItem.index;

				let verts = renderable.vertices;
				for (let v = 0, u=0, n = renderable.numFloats; v < n; v += this.vertexSize, ++u) {
					verts[v] = atlasItem.vertex[u].meshPosition.x;
					verts[v + 1] = atlasItem.vertex[u].meshPosition.y;
					verts[v + 2] = verts[v + 3] = verts[v + 4] = verts[v + 5] = 1;
					verts[v + 6] = atlasItem.vertex[u].texturePosition.x / img.width;
					verts[v + 7] = atlasItem.vertex[u].texturePosition.y / img.height;
					if(twoColorTint){
						verts[v + 8] = verts[v + 9] = verts[v + 10] = 0;
						verts[v + 11] = 1;
					}
				}
				let view = (renderable.vertices as Float32Array).subarray(0, renderable.numFloats);
				batcher.draw(texture, view, triangles); 
			}

		}
	}
}
