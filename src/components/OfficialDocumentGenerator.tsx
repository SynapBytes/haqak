import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Printer, FileDown, ShieldCheck, QrCode, Download } from "lucide-react";
import { toast } from "sonner";
import { useReactToPrint } from "react-to-print";

interface DocumentProps {
  type: "issue_report" | "mp_response";
  data: {
    id: string;
    title: string;
    description: string;
    citizenName: string;
    mpName?: string;
    category: string;
    location: string;
    date: string;
    status: string;
    responseText?: string;
  };
}

const OfficialDocumentGenerator: React.FC<DocumentProps> = ({ type, data }) => {
  const componentRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
    documentTitle: `Sutak_Official_${data.id}`,
    onAfterPrint: () => toast.success("تم تجهيز المستند للطباعة"),
  });

  const handleDownloadPDF = () => {
    toast.info("جاري تجهيز نسخة الـ PDF الرسمية...");
    // Logic for actual PDF download would go here
    handlePrint();
  };

  return (
    <div className="flex gap-2">
      <Button 
        onClick={handlePrint} 
        variant="outline" 
        className="gap-2 border-accent/20 text-accent hover:bg-accent/5 rounded-xl"
      >
        <Printer className="w-4 h-4" />
        طباعة رسمية
      </Button>
      <Button 
        onClick={handleDownloadPDF} 
        className="gap-2 bg-accent hover:bg-accent/90 rounded-xl"
      >
        <FileDown className="w-4 h-4" />
        تحميل PDF
      </Button>

      {/* Hidden Printable Content */}
      <div style={{ display: "none" }}>
        <div ref={componentRef} className="p-12 bg-white text-black font-serif dir-rtl" dir="rtl">
          {/* Header Section */}
          <div className="flex justify-between items-start border-b-2 border-black pb-6 mb-8">
            <div className="text-right">
              <h1 className="text-2xl font-bold mb-1">جمهورية مصر العربية</h1>
              <h2 className="text-xl font-bold mb-1">منصة «صوتك» الإلكترونية</h2>
              <p className="text-sm">منظومة التواصل السيادي بين المواطن والبرلمان</p>
            </div>
            <div className="w-24 h-24 bg-slate-100 flex items-center justify-center border border-black rounded-lg">
               <ShieldCheck className="w-16 h-16 text-slate-800" />
            </div>
          </div>

          {/* Document Title */}
          <div className="text-center mb-10">
            <h3 className="text-2xl font-bold underline decoration-double">
              {type === "issue_report" ? "تقرير شكوى رسمية موثقة" : "رد رسمي من عضو مجلس النواب"}
            </h3>
            <p className="text-sm mt-2">رقم المرجع: <span className="font-mono">{data.id.slice(0, 8).toUpperCase()}</span></p>
          </div>

          {/* Main Content Table */}
          <div className="space-y-6 mb-12">
            <div className="grid grid-cols-4 border border-black p-4">
              <div className="font-bold border-l border-black pl-2">اسم المواطن:</div>
              <div className="col-span-3 pr-2">{data.citizenName}</div>
            </div>

            <div className="grid grid-cols-4 border border-black p-4">
              <div className="font-bold border-l border-black pl-2">موضوع الشكوى:</div>
              <div className="col-span-3 pr-2 font-bold">{data.title}</div>
            </div>

            <div className="grid grid-cols-4 border border-black p-4">
              <div className="font-bold border-l border-black pl-2">التصنيف والمنطقة:</div>
              <div className="col-span-3 pr-2">{data.category} - {data.location}</div>
            </div>

            <div className="border border-black p-6 min-h-[200px]">
              <h4 className="font-bold mb-4 underline">تفاصيل الشكوى (الصياغة الرسمية):</h4>
              <p className="leading-loose text-justify">{data.description}</p>
            </div>

            {type === "mp_response" && data.responseText && (
              <div className="border-2 border-black bg-slate-50 p-6 mt-8">
                <h4 className="font-bold mb-4 underline">رد النائب الموقر / {data.mpName}:</h4>
                <p className="leading-loose text-justify font-bold italic">{data.responseText}</p>
              </div>
            )}
          </div>

          {/* Footer & Security */}
          <div className="mt-auto pt-12 border-t border-black flex justify-between items-end">
            <div className="text-right space-y-2">
              <p className="font-bold">التوقيع الإلكتروني المعتمد:</p>
              <div className="w-48 h-12 bg-slate-100 border border-dashed border-black flex items-center justify-center italic text-sm">
                Sutak_Verified_Digital_Signature
              </div>
              <p className="text-xs">حرر في: {data.date}</p>
            </div>
            <div className="text-center space-y-2">
              <div className="w-20 h-20 border border-black p-1 mx-auto">
                <QrCode className="w-full h-full" />
              </div>
              <p className="text-[10px]">امسح الكود للتحقق من صحة المستند</p>
            </div>
          </div>

          {/* Watermark */}
          <div className="fixed inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] rotate-[-45deg]">
             <h1 className="text-[120px] font-bold border-8 border-black p-10">صوتك - SUTAK</h1>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OfficialDocumentGenerator;
