import { errorMessage, type ClassRoom, type ImportPreview, type ImportResult } from '@dsvhvn/dung-chung/api';
import { Badge, Button, Icon, InlineMessage, Table, Td, TextAreaField, Th, Tr, useToast } from '@dsvhvn/dung-chung/ui';
import { useRef, useState, type DragEvent } from 'react';
import { studentsApi, type TemplateFormat } from '../../lib/api/classroomEndpoints';
import { saveFile } from '../../lib/saveBlob';
import { fileProblem, validRowsOf } from './studentImport';

// Nhập danh sách học sinh: tệp Excel (.xlsx) hoặc CSV UTF-8 theo mẫu một cột "Họ và tên", hoặc dán họ tên (mỗi dòng một em).
// Bước xem trước chưa lưu gì: báo từng dòng hợp lệ hay lỗi (trống, quá dài, vượt sĩ số) và cảnh báo trùng họ tên (chỉ cảnh
// báo vì mã học sinh phân biệt các em). "Lưu các dòng hợp lệ" lưu trong một giao dịch; dòng lỗi bị bỏ qua và được báo đủ.

interface ImportPanelProps {
  classRoom: ClassRoom;
  onImported: (result: ImportResult) => void;
  onCancel: () => void;
}

export function ImportPanel({ classRoom, onImported, onCancel }: ImportPanelProps) {
  const toast = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState('');
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState(false);

  const runPreview = async (source: { file: File } | { text: string }) => {
    setChecking(true);
    setProblem(null);
    try {
      const { data } = await studentsApi.preview(classRoom.id, source);
      setPreview(data);
    } catch (error) {
      setPreview(null);
      setProblem(errorMessage(error));
    } finally {
      setChecking(false);
    }
  };

  const choose = (picked: File | undefined) => {
    if (!picked) return;
    const bad = fileProblem(picked);
    if (bad) {
      setProblem(bad);
      return;
    }
    setFile(picked);
    setText('');
    void runPreview({ file: picked });
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    choose(event.dataTransfer.files[0]);
  };

  const clearFile = () => {
    setFile(null);
    setPreview(null);
    setProblem(null);
    if (fileInput.current) fileInput.current.value = '';
  };

  const downloadTemplate = async (format: TemplateFormat) => {
    try {
      saveFile(await studentsApi.template(classRoom.id, format));
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const save = async () => {
    if (!preview) return;
    setSaving(true);
    try {
      const { data } = await studentsApi.import(classRoom.id, validRowsOf(preview));
      onImported(data);
    } catch (error) {
      setProblem(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const skipped = preview ? preview.totalRows - preview.validCount : 0;

  return (
    <div className="flex flex-col gap-5">
      {problem && <InlineMessage tone="danger">{problem}</InlineMessage>}

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={
          'flex flex-col items-center gap-2 rounded-md border-2 border-dashed px-4 py-6 text-center ' +
          (dragging ? 'border-primary bg-primary-container' : 'border-border-strong bg-surface-container-low')
        }
      >
        <Icon name="upload" size={24} className="text-on-surface-variant" />
        <p className="type-body-m font-medium text-on-surface">Kéo thả tệp Excel (.xlsx) hoặc CSV vào đây, hoặc bấm để chọn tệp</p>
        <p className="type-body-s text-on-surface-variant">Mỗi dòng một học sinh, tối đa 60 dòng, tệp tối đa 1 MB.</p>
        <input
          ref={fileInput}
          type="file"
          accept=".xlsx,.csv"
          className="sr-only"
          aria-label="Chọn tệp danh sách học sinh"
          onChange={(e) => choose(e.target.files?.[0])}
        />
        <Button variant="secondary" size="sm" onClick={() => fileInput.current?.click()}>
          Chọn tệp
        </Button>
        {file && (
          <p className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 type-body-s">
            <Icon name="file-text" size={16} />
            {file.name}
            {preview && ` · ${preview.totalRows} dòng`}
            <button type="button" onClick={clearFile} aria-label="Bỏ tệp đã chọn" className="text-on-surface-variant hover:text-on-surface">
              <Icon name="x" size={16} />
            </button>
          </p>
        )}
      </div>

      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 type-body-s text-on-surface-variant">
        <Icon name="download" size={16} />
        Tải tệp mẫu (một cột Họ và tên):
        <Button variant="link" onClick={() => void downloadTemplate('xlsx')}>
          Excel (.xlsx)
        </Button>
        <Button variant="link" onClick={() => void downloadTemplate('csv')}>
          CSV (.csv)
        </Button>
      </p>

      <div className="flex flex-col gap-3">
        <TextAreaField
          label="Hoặc dán họ tên, mỗi dòng một em"
          name="danh-sach"
          rows={4}
          placeholder={'Ví dụ:\nNguyễn Minh Anh\nTrần Gia Bảo'}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (file) clearFile();
            setPreview(null);
          }}
        />
        <div>
          <Button
            variant="secondary"
            loading={checking && !file}
            disabled={text.trim() === ''}
            onClick={() => void runPreview({ text })}
          >
            Xem trước
          </Button>
        </div>
      </div>

      {checking && file && <p className="type-body-s text-on-surface-variant">Đang kiểm tra tệp…</p>}

      {preview && (
        <section aria-label="Xem trước danh sách" className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="type-h4 mr-2">Xem trước {preview.totalRows} dòng</h3>
            <Badge tone="success">{`${preview.validCount} hợp lệ`}</Badge>
            {skipped > 0 && <Badge tone="danger">{`${skipped} bị bỏ qua`}</Badge>}
            {preview.warningCount > 0 && <Badge tone="warning">{`${preview.warningCount} trùng họ tên`}</Badge>}
          </div>
          <div className="max-h-72 overflow-y-auto rounded-md">
            <Table caption="Xem trước danh sách học sinh">
              <thead>
                <tr>
                  <Th className="w-20">STT</Th>
                  <Th>Họ tên</Th>
                  <Th>Kết quả kiểm tra</Th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row) => (
                  <Tr key={row.rowNumber}>
                    <Td className="type-mono-label">{row.rowNumber}</Td>
                    <Td>{row.fullName ? row.fullName : <span className="text-on-surface-muted">(trống)</span>}</Td>
                    <Td>
                      <div className="flex flex-wrap gap-2">
                        {row.isValid && <Badge tone="success">Hợp lệ</Badge>}
                        {row.errors.map((e) => (
                          <Badge key={e} tone="danger">
                            {e}
                          </Badge>
                        ))}
                        {row.warnings.map((w) => (
                          <Badge key={w} tone="warning">
                            {w}
                          </Badge>
                        ))}
                      </div>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </div>
          <p className="type-body-s text-on-surface-variant">
            Trùng họ tên chỉ là cảnh báo vì mỗi em có mã học sinh riêng. Dòng trống, quá dài hoặc làm lớp vượt sĩ số tối đa{' '}
            {preview.maxStudents} sẽ bị bỏ qua. Lớp còn {preview.remainingCapacity} chỗ.
          </p>
        </section>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="type-body-s text-on-surface-variant" aria-live="polite">
          {preview ? `${preview.validCount} dòng hợp lệ · ${skipped} dòng bị bỏ qua` : 'Chọn tệp hoặc dán danh sách để xem trước.'}
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onCancel} disabled={saving}>
            Hủy
          </Button>
          <Button onClick={() => void save()} loading={saving} disabled={!preview || preview.validCount === 0}>
            Lưu các dòng hợp lệ
          </Button>
        </div>
      </div>
    </div>
  );
}
