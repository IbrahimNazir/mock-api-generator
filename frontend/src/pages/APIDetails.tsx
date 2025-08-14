import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { apisAPI, endpointsAPI, API, Endpoint, authAPI, User } from '@/lib/api';
import { APITester } from '@/components/api/APITester';
import { 
  Plus, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Globe, 
  Lock, 
  Code, 
  Database,
  ArrowLeft,
  Copy,
  ExternalLink
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const APIDetails = () => {
  const { apiId } = useParams<{ apiId: string }>();
  const [api, setApi] = useState<API | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteAPIDialogOpen, setDeleteAPIDialogOpen] = useState(false);
  const [deleteEndpointDialogOpen, setDeleteEndpointDialogOpen] = useState(false);
  const [endpointToDelete, setEndpointToDelete] = useState<Endpoint | null>(null);
  const [apiTesterOpen, setApiTesterOpen] = useState(false);
  const [selectedEndpoint, setSelectedEndpoint] = useState<Endpoint | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (apiId) {
      loadAPIDetails();
    }
  }, [apiId]);

  const loadAPIDetails = async () => {
    if (!apiId) return;

    try {
      const [userResponse, apiResponse, endpointsResponse] = await Promise.all([
        authAPI.getProfile(),
        apisAPI.getAPI(apiId),
        endpointsAPI.getByAPI(apiId)
      ]);
      
      setUser(userResponse.data);
      setApi(apiResponse.data);
      setEndpoints(endpointsResponse.data);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load API details",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: `${label} copied successfully`,
    });
  };

  const handleDeleteAPI = async () => {
    if (!api) return;

    try {
      await apisAPI.deleteAPI(api.id);
      toast({
        title: "API deleted",
        description: `${api.name} has been deleted successfully`,
      });
      navigate('/apis');
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete API",
      });
    } finally {
      setDeleteAPIDialogOpen(false);
    }
  };

  const handleDeleteEndpoint = async () => {
    if (!endpointToDelete) return;

    try {
      await endpointsAPI.deleteEndpoint(endpointToDelete.id);
      setEndpoints(endpoints.filter(e => e.id !== endpointToDelete.id));
      toast({
        title: "Endpoint deleted",
        description: `Endpoint ${endpointToDelete.path} has been deleted successfully`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete endpoint",
      });
    } finally {
      setDeleteEndpointDialogOpen(false);
      setEndpointToDelete(null);
    }
  };

  const openDeleteEndpointDialog = (endpoint: Endpoint) => {
    setEndpointToDelete(endpoint);
    setDeleteEndpointDialogOpen(true);
  };

  const openAPITester = (endpoint: Endpoint) => {
    setSelectedEndpoint(endpoint);
    setApiTesterOpen(true);
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET': return 'bg-green-100 text-green-800';
      case 'POST': return 'bg-blue-100 text-blue-800';
      case 'PUT': return 'bg-yellow-100 text-yellow-800';
      case 'PATCH': return 'bg-orange-100 text-orange-800';
      case 'DELETE': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-32" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!api) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-12 text-center">
          <h3 className="text-lg font-semibold mb-2">API not found</h3>
          <p className="text-muted-foreground mb-6">
            The API you're looking for doesn't exist or you don't have permission to view it
          </p>
          <Link to="/apis">
            <Button>Back to APIs</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const baseURL = `http://localhost:3000/${user?.username || 'api'}${api.base_path}`;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/apis')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to APIs
          </Button>
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <h1 className="text-3xl font-bold">{api.name}</h1>
              <Badge variant={api.is_public ? "default" : "secondary"}>
                {api.is_public ? (
                  <>
                    <Globe className="h-3 w-3 mr-1" />
                    Public
                  </>
                ) : (
                  <>
                    <Lock className="h-3 w-3 mr-1" />
                    Private
                  </>
                )}
              </Badge>
            </div>
            <p className="text-muted-foreground">{api.description}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Link to={`/apis/${api.id}/endpoints/new`}>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Endpoint
            </Button>
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate(`/apis/${api.id}/edit`)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit API
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setDeleteAPIDialogOpen(true)}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete API
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
          <TabsTrigger value="documentation">Documentation</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>API Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Version:</span>
                  <span className="font-mono">{api.version}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Base URL:</span>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-sm">{baseURL}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(baseURL, 'Base URL')}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Visibility:</span>
                  <Badge variant={api.is_public ? "default" : "secondary"}>
                    {api.is_public ? "Public" : "Private"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Created:</span>
                  <span>{new Date(api.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Last Updated:</span>
                  <span>{new Date(api.updated_at).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Total Endpoints:</span>
                  <span className="font-semibold">{endpoints.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Mock Enabled:</span>
                  <span className="font-semibold">
                    {endpoints.filter(e => e.mock_enabled).length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Total Mock Records:</span>
                  <span className="font-semibold">
                    {endpoints.reduce((sum, e) => sum + (e.mock_enabled ? e.mock_count : 0), 0)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Endpoints Tab */}
        <TabsContent value="endpoints" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Endpoints</h2>
            {/* <Link to={`/apis/${api.id}/endpoints/new`}>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Endpoint
              </Button>
            </Link> */}
          </div>

          {endpoints.length > 0 ? (
            <div className="space-y-4">
              {endpoints.map((endpoint) => (
                <Card key={endpoint.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <code className="bg-muted px-2 py-1 rounded text-sm">
                          {baseURL}{endpoint.path}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openAPITester(endpoint)}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(baseURL+endpoint.path, 'Endpoint')}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <div className="flex space-x-1">
                          {endpoint.methods.map((method) => (
                            <Badge 
                              key={method} 
                              className={`text-xs ${getMethodColor(method)}`}
                            >
                              {method}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {endpoint.mock_enabled && (
                          <Badge variant="outline">
                            <Database className="h-3 w-3 mr-1" />
                            {endpoint.mock_count} records
                          </Badge>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/apis/${api.id}/endpoints/${endpoint.id}/edit`)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Endpoint
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openAPITester(endpoint)}>
                              <ExternalLink className="mr-2 h-4 w-4" />
                              Test Endpoint
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => openDeleteEndpointDialog(endpoint)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete Endpoint
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    <CardDescription>{endpoint.description}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-12 text-center">
              <Code className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No endpoints yet</h3>
              <p className="text-muted-foreground mb-6">
                Create your first endpoint to start generating mock data
              </p>
              <Link to={`/apis/${api.id}/endpoints/new`}>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Endpoint
                </Button>
              </Link>
            </Card>
          )}
        </TabsContent>

        {/* Documentation Tab */}
        <TabsContent value="documentation" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>API Documentation</CardTitle>
              <CardDescription>
                Interactive documentation for your API endpoints
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="bg-muted p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">Base URL</h4>
                  <code className="text-sm">{baseURL}</code>
                </div>

                {endpoints.map((endpoint) => (
                  <div key={endpoint.id} className="border rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <h4 className="font-semibold">{endpoint.path}</h4>
                      <div className="flex space-x-1">
                        {endpoint.methods.map((method) => (
                          <Badge 
                            key={method} 
                            className={`text-xs ${getMethodColor(method)}`}
                          >
                            {method}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <p className="text-muted-foreground text-sm mb-4">
                      {endpoint.description}
                    </p>
                    
                    {endpoint.schema && (
                      <div>
                        <h5 className="font-medium mb-2">Response Schema</h5>
                        <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
                          {JSON.stringify(endpoint.schema, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete API Dialog */}
      <AlertDialog open={deleteAPIDialogOpen} onOpenChange={setDeleteAPIDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the API "{api?.name}" and all its endpoints and mock data. 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAPI}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete API
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Endpoint Dialog */}
      <AlertDialog open={deleteEndpointDialogOpen} onOpenChange={setDeleteEndpointDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the endpoint "{endpointToDelete?.path}" and all its mock data. 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteEndpoint}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Endpoint
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* API Tester */}
      <APITester
        open={apiTesterOpen}
        onOpenChange={setApiTesterOpen}
        endpoint={selectedEndpoint || undefined}
        baseURL={baseURL}
      />
    </div>
  );
};