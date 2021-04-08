module spine {
	export class BinaryHeader {
		private tag1: number;
		private tag2: number;
		private tag3: number;
		private tag4: number;

		public majorVersion: number;
		public minerVersion: number;
		public bodyCount: number;

		constructor(bytes: DataView) {
			let num = 0;

			this.tag1 = bytes.getInt8(num++);
			this.tag2 = bytes.getInt8(num++);
			this.tag3 = bytes.getInt8(num++);
			this.tag4 = bytes.getInt8(num++);

			this.majorVersion = bytes.getInt32(num, true);
			num += 4;
			this.minerVersion = bytes.getInt32(num, true);
			num += 4;
			this.bodyCount = bytes.getInt32(num, true);
		}

		public checkTag(): boolean {
			return this.tag1 == 99   // 'c'
				&& this.tag2 == 121  // 'y'
				&& this.tag3 == 115  // 's'
				&& this.tag4 == 112; // 'p'
		}

		public checkVersion(): boolean {
			return this.majorVersion == 0 && this.minerVersion == 1;
		}
	}
}
