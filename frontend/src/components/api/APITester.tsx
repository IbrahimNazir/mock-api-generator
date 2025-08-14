import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { 
  Play, 
  Plus, 
  Trash2, 
  Copy,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { BASE_URL_MOCK, Endpoint } from '@/lib/api';

interface APITesterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  endpoint?: Endpoint;
  baseURL?: string;
}

interface Header {
  key: string;
  value: string;
  enabled: boolean;
}

interface APIResponse {
  status: number;
  statusText: string;
  data: any;
  headers: Record<string, string>;
  duration: number;
}

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

export const APITester: React.FC<APITesterProps> = ({
  open,
  onOpenChange,
  endpoint,
  baseURL = BASE_URL_MOCK
}) => {
  const [method, setMethod] = useState('GET');
  const [url, setUrl] = useState('');
  const [headers, setHeaders] = useState<Header[]>([
    { key: 'Content-Type', value: 'application/json', enabled: true }
  ]);
  const [body, setBody] = useState('');
  const [response, setResponse] = useState<APIResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [jsonError, setJsonError] = useState('');
  const { toast } = useToast();

  // Auto-populate when endpoint changes
  useEffect(() => {
    if (endpoint && baseURL) {
      setUrl(`${baseURL}${endpoint.path}`);
      setMethod(endpoint.methods[0] || 'GET');
    }
  }, [endpoint, baseURL]);

  const addHeader = () => {
    setHeaders([...headers, { key: '', value: '', enabled: true }]);
  };

  const updateHeader = (index: number, field: keyof Header, value: string | boolean) => {
    const newHeaders = [...headers];
    newHeaders[index] = { ...newHeaders[index], [field]: value };
    setHeaders(newHeaders);
  };

  const removeHeader = (index: number) => {
    setHeaders(headers.filter((_, i) => i !== index));
  };

  const validateJSON = (jsonString: string) => {
    try {
      if (jsonString.trim()) {
        JSON.parse(jsonString);
      }
      setJsonError('');
      return true;
    } catch (error) {
      setJsonError('Invalid JSON format');
      return false;
    }
  };

  const sendRequest = async () => {
    if (!url.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "URL is required",
      });
      return;
    }

    if (body && !validateJSON(body)) {
      return;
    }

    setLoading(true);
    const startTime = Date.now();

    try {
      const requestHeaders: Record<string, string> = {};
      headers
        .filter(h => h.enabled && h.key && h.value)
        .forEach(h => {
          requestHeaders[h.key] = h.value;
        });

      const requestInit: RequestInit = {
        method,
        headers: requestHeaders,
      };

      if (['POST', 'PUT', 'PATCH'].includes(method) && body.trim()) {
        requestInit.body = body;
      }

      const response = await fetch(url, requestInit);
      const duration = Date.now() - startTime;
      
      let responseData;
      const contentType = response.headers.get('content-type');
      
      if (contentType?.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }

      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      setResponse({
        status: response.status,
        statusText: response.statusText,
        data: responseData,
        headers: responseHeaders,
        duration
      });

      toast({
        title: "Request completed",
        description: `${method} ${url} - ${response.status} ${response.statusText}`,
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      setResponse({
        status: 0,
        statusText: 'Network Error',
        data: { error: error.message },
        headers: {},
        duration
      });

      toast({
        variant: "destructive",
        title: "Request failed",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const copyResponse = () => {
    if (response) {
      navigator.clipboard.writeText(JSON.stringify(response.data, null, 2));
      toast({
        title: "Copied to clipboard",
        description: "Response data copied successfully",
      });
    }
  };

  const getStatusIcon = () => {
    if (!response) return null;
    
    if (response.status === 0) {
      return <XCircle className="h-4 w-4 text-destructive" />;
    } else if (response.status >= 200 && response.status < 300) {
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    } else if (response.status >= 400) {
      return <AlertCircle className="h-4 w-4 text-destructive" />;
    } else {
      return <AlertCircle className="h-4 w-4 text-yellow-600" />;
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[900px] sm:max-w-[900px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>API Tester</SheetTitle>
          <SheetDescription>
            Test your API endpoints and view responses
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Request Section */}
          <Card>
            <CardHeader>
              <CardTitle>Request</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Method and URL */}
              <div className="flex space-x-2">
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HTTP_METHODS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Enter request URL..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={sendRequest} disabled={loading}>
                  {loading ? (
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  Send
                </Button>
              </div>

              <Tabs defaultValue="headers" className="w-full">
                <TabsList>
                  <TabsTrigger value="headers">Headers</TabsTrigger>
                  <TabsTrigger value="body">Body</TabsTrigger>
                </TabsList>
                
                <TabsContent value="headers" className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Headers</Label>
                    <Button variant="outline" size="sm" onClick={addHeader}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Header
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    {headers.map((header, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <Input
                          placeholder="Header name"
                          value={header.key}
                          onChange={(e) => updateHeader(index, 'key', e.target.value)}
                          className="flex-1"
                        />
                        <Input
                          placeholder="Header value"
                          value={header.value}
                          onChange={(e) => updateHeader(index, 'value', e.target.value)}
                          className="flex-1"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeHeader(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </TabsContent>
                
                <TabsContent value="body" className="space-y-4">
                  <div>
                    <Label>Request Body (JSON)</Label>
                    <Textarea
                      placeholder='{"key": "value"}'
                      value={body}
                      onChange={(e) => {
                        setBody(e.target.value);
                        validateJSON(e.target.value);
                      }}
                      className="mt-2 min-h-[150px] font-mono text-sm"
                    />
                    {jsonError && (
                      <p className="text-destructive text-sm mt-1">{jsonError}</p>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Response Section */}
          {response && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    {getStatusIcon()}
                    <span>Response</span>
                    <Badge
                      variant={
                        response.status >= 200 && response.status < 300
                          ? "default"
                          : response.status >= 400
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {response.status} {response.statusText}
                    </Badge>
                    <Badge variant="outline">
                      <Clock className="h-3 w-3 mr-1" />
                      {response.duration}ms
                    </Badge>
                  </CardTitle>
                  <Button variant="outline" size="sm" onClick={copyResponse}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="body" className="w-full">
                  <TabsList>
                    <TabsTrigger value="body">Response Body</TabsTrigger>
                    <TabsTrigger value="headers">Response Headers</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="body">
                    <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                      {typeof response.data === 'string' 
                        ? response.data 
                        : JSON.stringify(response.data, null, 2)
                      }
                    </pre>
                  </TabsContent>
                  
                  <TabsContent value="headers">
                    <div className="space-y-2">
                      {Object.entries(response.headers).map(([key, value]) => (
                        <div key={key} className="flex justify-between py-2 border-b">
                          <span className="font-medium">{key}:</span>
                          <span className="text-muted-foreground">{value}</span>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};