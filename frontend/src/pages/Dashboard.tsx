import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/lib/auth';
import { apisAPI, API } from '@/lib/api';
import { Plus, Code, Users, Globe, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const Dashboard = () => {
  const { user } = useAuth();
  const [apis, setApis] = useState<API[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadAPIs();
  }, []);

  const loadAPIs = async () => {
    try {
      const response = await apisAPI.getUserAPIs();
      setApis(response.data);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load APIs",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const recentAPIs = apis.slice(0, 3);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Welcome back, {user?.username}!</h1>
          <p className="text-muted-foreground mt-1">
            Manage your mock APIs and endpoints from your dashboard
          </p>
        </div>
        <Link to="/apis/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create API
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total APIs</CardTitle>
            <Code className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{apis.length}</div>
            <p className="text-xs text-muted-foreground">
              {apis.filter(api => api.is_public).length} public
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active APIs</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{apis.filter(api => api.is_public).length}</div>
            <p className="text-xs text-muted-foreground">
              Publicly accessible
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Private APIs</CardTitle>
            <Lock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{apis.filter(api => !api.is_public).length}</div>
            <p className="text-xs text-muted-foreground">
              Private development
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent APIs */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Recent APIs</h2>
          <Link to="/apis">
            <Button variant="outline">View all</Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-2/3" />
                  <Skeleton className="h-4 w-full" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-1/2 mb-2" />
                  <Skeleton className="h-4 w-1/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : apis.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentAPIs.map((api) => (
              <Card key={api.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{api.name}</CardTitle>
                    <Badge variant={api.is_public ? "default" : "secondary"}>
                      {api.is_public ? "Public" : "Private"}
                    </Badge>
                  </div>
                  <CardDescription>{api.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>v{api.version}</span>
                    <span>{api.base_path}</span>
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-xs text-muted-foreground">
                      Created {new Date(api.created_at).toLocaleDateString()}
                    </span>
                    <Link to={`/apis/${api.id}`}>
                      <Button size="sm" variant="outline">
                        View Details
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center">
            <Code className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No APIs yet</h3>
            <p className="text-muted-foreground mb-6">
              Create your first mock API to get started
            </p>
            <Link to="/apis/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First API
              </Button>
            </Link>
          </Card>
        )}
      </div>
    </div>
  );
};