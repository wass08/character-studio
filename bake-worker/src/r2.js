import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

export function createR2(config) {
  const client = new S3Client({
    endpoint: config.r2Endpoint,
    region: "auto",
    credentials: {
      accessKeyId: config.r2AccessKeyId,
      secretAccessKey: config.r2SecretAccessKey,
    },
  });

  async function putObject(key, body, contentType, cacheControl) {
    return client.send(
      new PutObjectCommand({
        Bucket: config.r2Bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: cacheControl,
      }),
    );
  }

  function publicUrl(key) {
    const baseUrl = config.r2PublicUrl.replace(/\/+$/, "");
    const normalizedKey = key.replace(/^\/+/, "");
    return `${baseUrl}/${normalizedKey}`;
  }

  return { client, putObject, publicUrl, config };
}
