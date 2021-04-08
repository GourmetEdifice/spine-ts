module spine {
	function DataViewGetInt64function(dataView: DataView, byteOffset: number, littleEndian?: boolean) {
		// split 64-bit number into two 32-bit parts
		const left = dataView.getUint32(byteOffset, littleEndian);
		const right = dataView.getUint32(byteOffset + 4, littleEndian);
		
		// combine the two 32-bit values
		const combined = littleEndian ? left + 2 ** 32 * right : 2 ** 32 * left + right;
	
		//if (!Number.isSafeInteger(combined))
		//	console.warn(combined, 'exceeds MAX_SAFE_INTEGER. Precision may be lost');
	
		return combined;
	};

    export enum FormatData {
		Base,
		Anime,
		Max
	}

	export class BinaryBodyAddress {
		bufferPosStart: number;
		bufferSize: number;
		binaryFormat: FormatData;

		constructor(public bytes: DataView) {
			let num = 0;

			this.bufferPosStart = DataViewGetInt64function(bytes, num, true);
			num += 8;

			this.bufferSize = DataViewGetInt64function(bytes, num, true);
			num += 8;

			this.binaryFormat = bytes.getInt32(num, true);
		}
	}
}
