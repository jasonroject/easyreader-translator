import sys
import tempfile
import unittest
from pathlib import Path
import pymupdf
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from annotate_pdf import annotate

class ExportTests(unittest.TestCase):
    def test_inline_text_is_written_to_a_copy_and_rotated_page_coordinates_work(self):
        with tempfile.TemporaryDirectory() as tmp:
            source, output = Path(tmp) / 'source.pdf', Path(tmp) / 'output.pdf'
            pdf = pymupdf.open(); page = pdf.new_page(width=600, height=800)
            page.insert_text((50, 50), 'Original engineering drawing'); page.set_rotation(90); pdf.save(source); pdf.close()
            before = source.read_bytes()
            annotate(source, output, [{'page': 1, 'notes': [{'point': {'x': 100, 'y': 200}, 'text': '核对应力 10 MPa', 'fontSize': 18, 'color': '#ef4444'}]}])
            self.assertEqual(source.read_bytes(), before)
            with pymupdf.open(output) as result:
                self.assertIn('Original engineering drawing', result[0].get_text())
                self.assertIn('核对应力', result[0].get_text())
                self.assertEqual(len(result), 1)

if __name__ == '__main__':
    unittest.main()
