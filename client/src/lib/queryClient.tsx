// Add debugging to check if apiRequest is properly handling the response
export async function apiRequest(method: string, url: string, body?: any) {
  console.log(`API Request: ${method} ${url}`, body || '');
  
  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('API Error:', errorData);
    throw new Error(errorData.error || response.statusText);
  }
  
  // Check if the response is JSON
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    const data = await response.json();
    console.log('API Response Data:', data);
    return data;
  }
  
  return response;
} 