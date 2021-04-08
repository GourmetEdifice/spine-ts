module spine {
	export class CyspHeader {
		magic_word : string;
		majorVersion : number;
		minerVersion : number;
		bodyCount : number;
		version : string;
		binaryBodyAddress : BinaryBodyAddress[] = [];
		constructor(public data: spine.BinaryStream) { 
			this.read();
		}

		private read() {
			this.magic_word = this.data.readStringByLength(4);
			if(this.magic_word != 'cysp') return;
			this.majorVersion = this.data.readInt32(true);
			this.minerVersion = this.data.readInt32(true);
			this.version = ''+this.majorVersion+'.'+this.minerVersion;
			this.bodyCount = this.data.readInt32(true);
			this.data.seek(16);
			for(let i=0; i<this.bodyCount; ++i){
				this.binaryBodyAddress.push(new BinaryBodyAddress(this.data));
			}
		}
	}
	
	class BinaryBodyAddress {
		private static format_data = [ 'base', 'anime', 'max' ];
		bufferPosStart : number;
		bufferSize : number;
		binaryFormat : number;
		binaryFormatType : string;
		
		constructor(public data: spine.BinaryStream) { 
			this.read();
		}

		private read() {
			this.bufferPosStart = this.data.readInt64(true);
			this.bufferSize = this.data.readInt64(true);
			this.binaryFormat = this.data.readInt32(true);
			this.binaryFormatType = BinaryBodyAddress.format_data[this.binaryFormat];
			this.data.seek(12);
		}
	}
	
}
