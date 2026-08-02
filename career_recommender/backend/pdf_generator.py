import subprocess
import tempfile
import os

def generate_pdf_from_html(html_content: str) -> bytes:
    """
    Takes a string of HTML, writes it to a temp file, calls a standalone
    Playwright script via subprocess to avoid Uvicorn asyncio loop issues,
    and returns the binary PDF data.
    """
    with tempfile.NamedTemporaryFile(delete=False, suffix=".html", mode="w", encoding="utf-8") as html_file:
        html_file.write(html_content)
        html_path = html_file.name
        
    pdf_path = html_path.replace(".html", ".pdf")
    
    script_path = os.path.join(os.path.dirname(__file__), "pdf_generator_script.py")
    
    try:
        # We explicitly use the same python interpreter running Uvicorn
        import sys
        result = subprocess.run(
            [sys.executable, script_path, html_path, pdf_path],
            check=True,
            capture_output=True,
            text=True
        )
        
        with open(pdf_path, "rb") as f:
            pdf_bytes = f.read()
            
        return pdf_bytes
    except subprocess.CalledProcessError as e:
        raise RuntimeError(f"PDF generation failed: {e.stderr}") from e
    finally:
        if os.path.exists(html_path):
            os.remove(html_path)
        if os.path.exists(pdf_path):
            os.remove(pdf_path)
