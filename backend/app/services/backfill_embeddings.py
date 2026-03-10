from app.core.supabase import supabase_admin
from app.services.embeddings_service import embed_text


def run_backfill():
    sb = supabase_admin()

    print("Fetching chunks without embeddings...")

    res = (
        sb.table("doc_chunks")
        .select("id,chunk_text")
        .is_("embedding", "null")
        .limit(5000)
        .execute()
    )

    rows = res.data or []

    if not rows:
        print("✅ No chunks need embedding.")
        return

    print(f"Found {len(rows)} chunks to embed.")

    for r in rows:
        try:
            vec = embed_text(r["chunk_text"])

            sb.table("doc_chunks").update(
                {"embedding": vec}
            ).eq("id", r["id"]).execute()

            print(f"Embedded chunk {r['id']}")

        except Exception as e:
            print(f"❌ Failed chunk {r['id']} -> {e}")

    print("🎉 Backfill complete.")


if __name__ == "__main__":
    run_backfill()