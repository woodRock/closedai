async function test() {
  const query = 'test';
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    console.log('Status:', response.status);
    const text = await response.text();
    const results = [];
    const resultRegex = /result__body">([\s\S]*?)<div class="clear">/g;
    const titleRegex = /class="result__a" href="([^"]+)">([\s\S]*?)<\/a>/;
    const snippetRegex = /class="result__snippet"[^>]*>([\s\S]*?)<\/a>/;

    let match;
    while ((match = resultRegex.exec(text)) !== null) {
      const block = match[1];
      const titleMatch = titleRegex.exec(block);
      const snippetMatch = snippetRegex.exec(block);
      
      if (titleMatch) {
        results.push({
          title: titleMatch[2].replace(/<[^>]*>/g, '').trim(),
          url: titleMatch[1],
          content: snippetMatch ? snippetMatch[1].replace(/<[^>]*>/g, '').trim() : ''
        });
      }
    }
    console.log('Found:', results.length);
    if (results.length > 0) {
      console.log('First Result:', JSON.stringify(results[0], null, 2));
    }
  } catch (e) {
    console.error(e);
  }
}
test();
