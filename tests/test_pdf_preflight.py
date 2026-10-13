import sys
import tempfile
import unittest
from pathlib import Path
import pymupdf

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from pdf_preflight import prepare_pdf, has_ocr_layer


class ScanTests(unittest.TestCase):
    def test_native_text_is_not_replaced(self):
        source = Path(__file__).parent / 'text-import.pdf'
        with tempfile.TemporaryDirectory() as tmp:
            self.assertEqual(prepare_pdf(source, Path(tmp) / 'out.pdf', lambda **kw: None), source)

    def test_scanned_rotated_page_becomes_searchable_without_visual_changes(self):
        with tempfile.TemporaryDirectory() as tmp:
            source, output = Path(tmp) / 'scan.pdf', Path(tmp) / 'ocr.pdf'
            original = pymupdf.open()
            page = original.new_page(width=500, height=350)
            page.insert_text((40, 80), 'Local document translation', fontsize=22)
            page.insert_text((40, 120), 'The reader preserves the page layout.', fontsize=18)
            pixels = page.get_pixmap(matrix=pymupdf.Matrix(2, 2)).tobytes('png')
            scan = pymupdf.open()
            page = scan.new_page(width=350, height=500)
            page.insert_image(page.rect, stream=pixels, rotate=90)
            page.set_rotation(90)
            scan.save(source)
            before = page.get_pixmap().samples
            self.assertEqual(prepare_pdf(source, output, lambda **kw: None), output)
            self.assertTrue(has_ocr_layer(output))
            self.assertFalse(has_ocr_layer(source))
            with pymupdf.open(output) as result:
                self.assertIn('translation', result[0].get_text().lower())
                self.assertEqual(result[0].get_pixmap().samples, before)

    def test_empty_page_has_actionable_error(self):
        with tempfile.TemporaryDirectory() as tmp:
            source = Path(tmp) / 'empty.pdf'
            pdf = pymupdf.open()
            pdf.new_page()
            pdf.save(source)
            with self.assertRaisesRegex(RuntimeError, '没有可翻译'):
                prepare_pdf(source, Path(tmp) / 'ocr.pdf', lambda **kw: None)


if __name__ == '__main__':
    unittest.main()
