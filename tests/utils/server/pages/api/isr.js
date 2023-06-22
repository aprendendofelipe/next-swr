export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    await res.revalidate(req.body.path);
    return res.json({ revalidated: true });
  } catch (err) {
    return res.status(500).send('Error revalidating');
  }
}
