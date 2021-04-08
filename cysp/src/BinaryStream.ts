/******************************************************************************
 * Spine Runtimes License Agreement
 * Last updated January 1, 2020. Replaces all prior versions.
 *
 * Copyright (c) 2013-2020, Esoteric Software LLC
 *
 * Integration of the Spine Runtimes into software or otherwise creating
 * derivative works of the Spine Runtimes is permitted under the terms and
 * conditions of Section 2 of the Spine Editor License Agreement:
 * http://esotericsoftware.com/spine-editor-license
 *
 * Otherwise, it is permitted to integrate the Spine Runtimes into software
 * or otherwise create derivative works of the Spine Runtimes (collectively,
 * "Products"), provided that each user of the Products must obtain their own
 * Spine Editor license and redistribution of the Products in any form must
 * include this license and copyright notice.
 *
 * THE SPINE RUNTIMES ARE PROVIDED BY ESOTERIC SOFTWARE LLC "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL ESOTERIC SOFTWARE LLC BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES,
 * BUSINESS INTERRUPTION, OR LOSS OF USE, DATA, OR PROFITS) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THE SPINE RUNTIMES, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *****************************************************************************/

module spine {
	export class BinaryStream {
		constructor(data: Uint8Array, public strings = new Array<string>(), private index: number = 0, private buffer = new DataView(data.buffer)) { 

		}

		readByte(): number {
			return this.buffer.getInt8(this.index++);
		}

		readShort(littleEndian : boolean = false): number {
			let value = this.buffer.getInt16(this.index, littleEndian);
			this.index += 2;
			return value;
		}

		readInt32(littleEndian : boolean = false): number {
			 let value = this.buffer.getInt32(this.index, littleEndian);
			 this.index += 4;
			 return value;
		}

		readInt64(littleEndian : boolean = false): number {
			// split 64-bit number into two 32-bit parts
			const left =  this.buffer.getUint32(this.index, littleEndian);
			const right = this.buffer.getUint32(this.index+4, littleEndian);
			this.index += 8;
			// combine the two 32-bit values
			const combined = littleEndian? left + 2**32*right : 2**32*left + right;

			//if (!Number.isSafeInteger(combined))
			//	console.warn(combined, 'exceeds MAX_SAFE_INTEGER. Precision may be lost');

			return combined;
		}

		seek(offset: number) {
			 this.index += offset;
		}

		readInt(optimizePositive: boolean) {
			let b = this.readByte();
			let result = b & 0x7F;
			if ((b & 0x80) != 0) {
				b = this.readByte();
				result |= (b & 0x7F) << 7;
				if ((b & 0x80) != 0) {
					b = this.readByte();
					result |= (b & 0x7F) << 14;
					if ((b & 0x80) != 0) {
						b = this.readByte();
						result |= (b & 0x7F) << 21;
						if ((b & 0x80) != 0) {
							b = this.readByte();
							result |= (b & 0x7F) << 28;
						}
					}
				}
			}
			return optimizePositive ? result : ((result >>> 1) ^ -(result & 1));
		}

		readStringRef (): string {
			let index = this.readInt(true);
			return index == 0 ? null : this.strings[index - 1];
		}

		readString (): string {
			let byteCount = this.readInt(true);
			switch (byteCount) {
			case 0:
				return null;
			case 1:
				return "";
			}
			byteCount--;
			let chars = "";
			let charCount = 0;
			for (let i = 0; i < byteCount;) {
				let b = this.readByte();
				switch (b >> 4) {
				case 12:
				case 13:
					chars += String.fromCharCode(((b & 0x1F) << 6 | this.readByte() & 0x3F));
					i += 2;
					break;
				case 14:
					chars += String.fromCharCode(((b & 0x0F) << 12 | (this.readByte() & 0x3F) << 6 | this.readByte() & 0x3F));
					i += 3;
					break;
				default:
					chars += String.fromCharCode(b);
					i++;
				}
			}
			return chars;
		}
		canRead (length: number): boolean {
			return this.buffer.byteLength - this.index > length;
		}
		readStringByLength (length: number): string {
			let max_offset = this.buffer.byteLength - this.index;
			if(max_offset<=0)return null;
			switch (length) {
				case 0:
					return null;
				case 1:
					return "";
			}
			let chars = "";
			let charCount = 0;
			for (let i = 0; i < max_offset && charCount < length;) {
				let b = this.readByte();
				switch (b >> 4) {//UTF-8
				case 12:
				case 13:
					chars += String.fromCharCode(((b & 0x1F) << 6 | this.readByte() & 0x3F));
					i += 2;
					break;
				case 14:
					chars += String.fromCharCode(((b & 0x0F) << 12 | (this.readByte() & 0x3F) << 6 | this.readByte() & 0x3F));
					i += 3;
					break;
				default:
					chars += String.fromCharCode(b);
					i++;
				}
				++charCount;
			}
			return chars;
		}

		readFloat (littleEndian : boolean = false): number {
			let value = this.buffer.getFloat32(this.index);
			this.index += 4;
			return value;
		}

		readBoolean (): boolean {
			return this.readByte() != 0;
		}
	}
}
