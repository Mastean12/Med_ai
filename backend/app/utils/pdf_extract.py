import io
from typing import Optional

from pypdf import PdfReader


def extract_text_from_pdf(content: bytes) -> str:
	"""Extracts and returns text from PDF bytes.

	This is a minimal implementation using pypdf. It returns the
	concatenated text of all pages. If extraction fails, it raises
	a ValueError.
	"""
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
