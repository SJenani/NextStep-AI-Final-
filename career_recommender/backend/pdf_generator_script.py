import sys
from playwright.sync_api import sync_playwright

def main():
    if len(sys.argv) != 3:
        print("Usage: python pdf_generator_script.py <input.html> <output.pdf>")
        sys.exit(1)
        
    input_html = sys.argv[1]
    output_pdf = sys.argv[2]
    
    with open(input_html, "r", encoding="utf-8") as f:
        html_content = f.read()
        
    full_html = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Lora:ital,wght@0,400..700;1,400..700&family=Outfit:wght@100..900&family=Merriweather:ital,wght@0,300;0,400;0,700;1,300;1,400&family=Fira+Code:wght@300..700&display=swap" rel="stylesheet">
        <style>
            body {{ margin: 0; padding: 0; background-color: white; }}
            @media print {{
                .print\\:hidden {{ display: none !important; }}
                .print\\:p-0 {{ padding: 0 !important; }}
                .print\\:m-0 {{ margin: 0 !important; }}
                
                /* Reset the top-level resume container for A4 */
                body > div {{
                    max-width: none !important;
                    width: 100% !important;
                    box-shadow: none !important;
                    border: none !important;
                    border-radius: 0 !important;
                    transform: none !important;
                    margin: 0 !important;
                    padding: 40px !important; /* Add some padding for the PDF page */
                }}
            }}
        </style>
    </head>
    <body>
        {html_content}
    </body>
    </html>
    """

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.set_content(full_html, wait_until="load")
        page.wait_for_timeout(1000)
        page.pdf(
            path=output_pdf,
            format="A4",
            print_background=True,
            margin={"top": "0", "right": "0", "bottom": "0", "left": "0"}
        )
        browser.close()

if __name__ == "__main__":
    main()
