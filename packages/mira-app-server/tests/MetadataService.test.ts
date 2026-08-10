import { BUILTIN_METADATA_RULES, MetadataService } from '../src/services/MetadataService';

const parse = async (name: string, raw: Record<string, any>) => {
  const rule = BUILTIN_METADATA_RULES.find(item => item.name === name)!;
  return rule.parse(raw, 'sample');
};

describe('built-in metadata rules', () => {
  it('extracts requested image fields', async () => {
    await expect(parse('builtin:image', {
      ImageWidth: 4000,
      ImageHeight: 3000,
      DateTimeOriginal: '2026:08:10 12:00:00',
      Make: 'Canon',
      Model: 'EOS R5',
      GPSLatitude: 35.6,
      GPSLongitude: 139.7,
      FNumber: 2.8,
      ExposureTime: '1/250',
      ISO: 400,
      LensModel: 'RF24-70mm F2.8',
    })).resolves.toEqual({
      width: 4000,
      height: 3000,
      dateTimeOriginal: '2026:08:10 12:00:00',
      cameraModel: 'Canon EOS R5',
      gps: { latitude: 35.6, longitude: 139.7 },
      aperture: 2.8,
      shutterSpeed: '1/250',
      iso: 400,
      lensModel: 'RF24-70mm F2.8',
    });
  });

  it('extracts requested video and audio fields', async () => {
    await expect(parse('builtin:video', {
      ImageWidth: 3840,
      ImageHeight: 2160,
      Duration: 12.5,
      MediaCreateDate: '2026:08:10 12:00:00',
      VideoFrameRate: 60,
      DeviceModelName: 'iPhone',
      VideoCodec: 'hvc1',
    })).resolves.toMatchObject({ width: 3840, height: 2160, duration: 12.5, frameRate: 60, codec: 'hvc1' });

    await expect(parse('builtin:audio', {
      Title: 'Track', Artist: 'Artist', Album: 'Album', Duration: 180,
      SampleRate: 48000, BitsPerSample: 24, NumChannels: 2, Year: 2026, Genre: 'Rock',
    })).resolves.toEqual({
      title: 'Track', artist: 'Artist', album: 'Album', duration: 180,
      sampleRate: 48000, bitDepth: 24, channels: 2, year: 2026, genre: 'Rock',
    });
  });
});

describe('metadata scan status', () => {
  it('counts supported files and reports unavailable ExifTool', async () => {
    const service = new MetadataService(null);
    const db = {
      getFiles: async () => ({
        result: [
          { id: 1, name: 'ready.jpg', metadata: { width: 100 } },
          { id: 2, name: 'pending.mp4', metadata: null },
          { id: 3, name: 'ignored.txt', metadata: null },
        ],
      }),
    } as any;

    await expect(service.getStats(db)).resolves.toMatchObject({
      available: false,
      totalFiles: 2,
      withMetadata: 1,
      withoutMetadata: 1,
      metadataRate: 50,
    });
    await expect(service.scanPending('library', db)).resolves.toEqual({ available: false, queued: 0 });
  });
});
