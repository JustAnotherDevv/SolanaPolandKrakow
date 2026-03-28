interface TavilyResult {
  title: string
  url: string
  content: string
  score: number
}

interface TavilyResponse {
  results: TavilyResult[]
  answer?: string
}

export async function webSearch(query: string, numResults = 5): Promise<TavilyResult[]> {
  const key = process.env.TAVILY_KEY
  if (!key) throw new Error('TAVILY_KEY not set')

  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: key,
      query,
      max_results: numResults,
      search_depth: 'basic',
      include_answer: true,
    }),
  })

  if (!res.ok) throw new Error(`Tavily error: ${res.status} ${await res.text()}`)
  const data = (await res.json()) as TavilyResponse
  return data.results ?? []
}
