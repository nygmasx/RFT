import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

function config() {
  const endpoint = process.env.S3_ENDPOINT;
  const region = process.env.S3_REGION ?? 'auto';
  const bucket = process.env.S3_BUCKET;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  const publicUrl = process.env.S3_PUBLIC_URL;
  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey || !publicUrl) return null;
  return { endpoint, region, bucket, accessKeyId, secretAccessKey, publicUrl: publicUrl.replace(/\/$/, '') };
}

export function objectStorageConfigured() {
  return Boolean(config());
}

export async function uploadAvatar(userId: string, dataUrl: string) {
  const storage = config();
  if (!storage) throw new Error('OBJECT_STORAGE_NOT_CONFIGURED');
  const match = dataUrl.match(/^data:image\/(jpeg|png|webp);base64,(.+)$/s);
  if (!match) throw new Error('INVALID_AVATAR');
  const extension = match[1] === 'jpeg' ? 'jpg' : match[1];
  const body = Buffer.from(match[2], 'base64');
  if (!body.length || body.length > 2_000_000) throw new Error('INVALID_AVATAR');
  const key = `avatars/${userId}/${crypto.randomUUID()}.${extension}`;
  const client = new S3Client({
    endpoint: storage.endpoint,
    region: storage.region,
    forcePathStyle: true,
    credentials: { accessKeyId: storage.accessKeyId, secretAccessKey: storage.secretAccessKey },
  });
  await client.send(new PutObjectCommand({
    Bucket: storage.bucket,
    Key: key,
    Body: body,
    ContentType: `image/${match[1]}`,
    CacheControl: 'public, max-age=31536000, immutable',
  }));
  return `${storage.publicUrl}/${key}`;
}
