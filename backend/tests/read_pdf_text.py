import pypdf

def extract_pdf_pages(file_path):
    reader = pypdf.PdfReader(file_path)
    output = []
    for idx, page in enumerate(reader.pages):
        output.append(f"\n==================== PAGE {idx+1} ({file_path}) ====================\n")
        output.append(page.extract_text() or "")
    return "\n".join(output)

if __name__ == "__main__":
    print(extract_pdf_pages("Scaler_SDE_Fullstack_Assignment_-_Fireflies_Clone.pdf"))
    print("\n" + "#"*80 + "\n")
    print(extract_pdf_pages("Fireflies Clone — Revised Implementation Plan.pdf"))
