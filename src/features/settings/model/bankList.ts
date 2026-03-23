export type BankMeta = {
  id: string;       // VCB, TCB, MB...
  shortName: string;
  fullName: string;
  bin?: string;     // Napas BIN
  logoUrl: string;  // Standard logo path
};

export const SUPPORTED_BANKS: BankMeta[] = [
  {
    id: "VCB",
    shortName: "Vietcombank",
    fullName: "Ngân hàng TMCP Ngoại thương Việt Nam",
    bin: "970436",
    logoUrl: "https://api.vietqr.io/img/VCB.png",
  },
  {
    id: "TCB",
    shortName: "Techcombank",
    fullName: "Ngân hàng TMCP Kỹ Thương Việt Nam",
    bin: "970407",
    logoUrl: "https://api.vietqr.io/img/TCB.png",
  },
  {
    id: "MB",
    shortName: "MBBank",
    fullName: "Ngân hàng TMCP Quân đội",
    bin: "970422",
    logoUrl: "https://api.vietqr.io/img/MB.png",
  },
  {
    id: "ACB",
    shortName: "ACB",
    fullName: "Ngân hàng TMCP Á Châu",
    bin: "970416",
    logoUrl: "https://api.vietqr.io/img/ACB.png",
  },
  {
    id: "VPB",
    shortName: "VPBank",
    fullName: "Ngân hàng TMCP Việt Nam Thịnh Vượng",
    bin: "970432",
    logoUrl: "https://api.vietqr.io/img/VPB.png",
  },
  {
    id: "TPB",
    shortName: "TPBank",
    fullName: "Ngân hàng TMCP Tiên Phong",
    bin: "970423",
    logoUrl: "https://api.vietqr.io/img/TPB.png",
  },
  {
    id: "BIDV",
    shortName: "BIDV",
    fullName: "Ngân hàng TMCP Đầu tư và Phát triển Việt Nam",
    bin: "970418",
    logoUrl: "https://api.vietqr.io/img/BIDV.png",
  },
  {
    id: "CTG",
    shortName: "VietinBank",
    fullName: "Ngân hàng TMCP Công Thương Việt Nam",
    bin: "970415",
    logoUrl: "https://api.vietqr.io/img/ICB.png",
  },
];

export const getBankById = (id: string) => SUPPORTED_BANKS.find(b => b.id === id);
