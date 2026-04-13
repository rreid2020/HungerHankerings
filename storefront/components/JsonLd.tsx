type JsonLdProps = {
  data: unknown;
  /** Optional DOM id for the script element. */
  id?: string;
};

/** Server-safe structured data (schema.org). */
export default function JsonLd({ data, id }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      {...(id ? { id } : {})}
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
