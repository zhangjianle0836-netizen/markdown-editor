declare module 'html2pdf.js' {
  interface Html2PdfChain {
    set: (options: unknown) => Html2PdfChain;
    from: (element: HTMLElement | string) => Html2PdfChain;
    save: () => Promise<void>;
  }

  type Html2PdfFactory = () => Html2PdfChain;

  const html2pdf: Html2PdfFactory;
  export default html2pdf;
}
