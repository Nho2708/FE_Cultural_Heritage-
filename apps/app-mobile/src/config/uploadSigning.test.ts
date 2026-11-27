import { addUploadSigning } from '../../app.config';

// Đoạn build.gradle do expo prebuild (SDK 57) sinh ra.
const GENERATED = [
  '    signingConfigs {',
  '        debug {',
  "            storeFile file('debug.keystore')",
  "            storePassword 'android'",
  "            keyAlias 'androiddebugkey'",
  "            keyPassword 'android'",
  '        }',
  '    }',
  '    buildTypes {',
  '        debug {',
  '            signingConfig signingConfigs.debug',
  '        }',
  '        release {',
  '            // Caution! In production, you need to generate your own keystore file.',
  '            signingConfig signingConfigs.debug',
  '            minifyEnabled enableMinifyInReleaseBuilds',
  '        }',
  '    }',
].join('\n');

describe('khóa tải lên Google Play trong build.gradle', () => {
  it('thêm cấu hình ký release đọc biến môi trường và chỉ đổi dòng ký của buildTypes.release', () => {
    const gradle = addUploadSigning(GENERATED);

    expect(gradle).toContain("storeFile file(System.getenv('DIVIET_UPLOAD_STORE_FILE'))");
    expect(gradle).toContain("keyPassword System.getenv('DIVIET_UPLOAD_KEY_PASSWORD')");
    expect(gradle.indexOf('        release {')).toBeLessThan(gradle.indexOf('        debug {'));
    expect(gradle).toContain("signingConfig System.getenv('DIVIET_UPLOAD_STORE_FILE') ? signingConfigs.release : signingConfigs.debug");
    // buildTypes.debug vẫn ký bằng khóa gỡ lỗi.
    expect(gradle.match(/signingConfig signingConfigs\.debug$/gm)).toHaveLength(1);
  });

  it('giữ kiểu xuống dòng CRLF và không thêm lần hai', () => {
    const crlf = GENERATED.replace(/\n/g, '\r\n');
    const once = addUploadSigning(crlf);

    expect(once).not.toMatch(/[^\r]\n/);
    expect(addUploadSigning(once)).toBe(once);
  });

  it('báo lỗi khi tệp không giống khuôn của Expo thay vì để bản release ký bằng khóa gỡ lỗi', () => {
    expect(() => addUploadSigning('android {\n}\n')).toThrow('chưa thêm được khóa tải lên');
  });
});
