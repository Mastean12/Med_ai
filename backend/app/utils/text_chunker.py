from typing import List

def chunk_text(text: str, chunk_size: int = 1000, overlap: int = 200) -> List[str]:
	"""Split `text` into chunks of approx `chunk_size` characters with `overlap`.

	This simple chunker avoids splitting words when possible.
	"""
	if not text:
		return []

	if chunk_size <= 0:
		raise ValueError("chunk_size must be > 0")

	chunks: List[str] = []
	start = 0
	text_len = len(text)
	while start < text_len:
		end = start + chunk_size
		if end >= text_len:
			chunks.append(text[start:text_len].strip())
			break

		# Try to avoid splitting in the middle of a word
		split_at = text.rfind(" ", start, end)
		if split_at <= start:
			split_at = end

		chunk = text[start:split_at].strip()
		if chunk:
			chunks.append(chunk)

		start = max(split_at - overlap, split_at)

	return chunks
