"""Extract text from PDF, DOCX, and TXT files."""
import io
from typing import Optional

from pypdf import PdfReader


def extract_text_from_pdf(content: bytes) -> str:
    if not content:
        return ""
    try:
        stream = io.BytesIO(content)
        reader = PdfReader(stream)
        texts = []
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                texts.append(page_text)
        return "\n\n".join(texts)
    except Exception as e:
        raise ValueError(f"Failed to extract PDF text: {e}")


def extract_text_from_docx(content: bytes) -> str:
    if not content:
        return ""
    try:
        from docx import Document
        stream = io.BytesIO(content)
        doc = Document(stream)
        paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
        return "\n\n".join(paragraphs)
    except ImportError:
        raise ValueError("python-docx is not installed. Install it to support .docx files.")
    except Exception as e:
        raise ValueError(f"Failed to extract DOCX text: {e}")


def extract_text_from_txt(content: bytes) -> str:
    if not content:
        return ""
    try:
        return content.decode("utf-8").strip()
    except UnicodeDecodeError:
        try:
            return content.decode("latin-1").strip()
        except Exception as e:
            raise ValueError(f"Failed to extract TXT text: {e}")


SUPPORTED_EXTENSIONS = {
    ".pdf": extract_text_from_pdf,
    ".docx": extract_text_from_docx,
    ".txt": extract_text_from_txt,
}


def get_supported_extensions() -> list[str]:
    return list(SUPPORTED_EXTENSIONS.keys())


def extract_text(filename: str, content: bytes) -> str:
    """Dispatch to the correct extractor based on file extension."""
    import os
    ext = os.path.splitext(filename)[1].lower()
    extractor = SUPPORTED_EXTENSIONS.get(ext)
    if not extractor:
        raise ValueError(f"Unsupported file type: {ext}. Supported: {', '.join(get_supported_extensions())}")
    return extractor(content)
