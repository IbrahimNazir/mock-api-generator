import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
import { apisAPI, API } from '@/lib/api';
import { Plus, Search, MoreVertical, Edit, Trash2, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const APIsPage = () => {
  const [apis, setApis] = useState<API[]>([]);
  const [filteredAPIs, setFilteredAPIs] = useState<API[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [apiToDelete, setApiToDelete] = useState<API | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadAPIs();
  }, []);

  useEffect(() => {
    const filtered = apis.filter(api =>
      api.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      api.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      api.base_path.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredAPIs(filtered);
  }, [apis, searchTerm]);

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

  const handleDeleteAPI = async () => {
    if (!apiToDelete) return;

    try {
      await apisAPI.deleteAPI(apiToDelete.id);
      setApis(apis.filter(api => api.id !== apiToDelete.id));
      toast({
        title: "API deleted",
        description: `${apiToDelete.name} has been deleted successfully`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete API",
      });
    } finally {
      setDeleteDialogOpen(false);
      setApiToDelete(null);
    }
  };

  const openDeleteDialog = (api: API) => {
    setApiToDelete(api);
    setDeleteDialogOpen(true);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">My APIs</h1>
          <p className="text-muted-foreground mt-1">
            Manage all your mock APIs and endpoints
          </p>
        </div>
        <Link to="/apis/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create API
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search APIs..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* APIs Grid */}
      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading APIs...</p>
        </div>
      ) : filteredAPIs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAPIs.map((api) => (
            <Card key={api.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{api.name}</CardTitle>
                  <div className="flex items-center space-x-2">
                    <Badge variant={api.is_public ? "default" : "secondary"}>
                      {api.is_public ? "Public" : "Private"}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/apis/${api.id}`)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate(`/apis/${api.id}/edit`)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit API
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => openDeleteDialog(api)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete API
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <CardDescription>{api.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Version:</span>
                    <span className="font-mono">{api.version}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Base Path:</span>
                    <span className="font-mono">{api.base_path}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Created:</span>
                    <span>{new Date(api.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-4">
                  {/* <Link to={`/apis/${api.id}/endpoints`}>
                    <Button size="sm" variant="outline">
                      Manage Endpoints
                    </Button>
                  </Link> */}
                  <div></div>
                  <Link to={`/apis/${api.id}`}>
                    <Button size="sm">
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
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-lg font-semibold mb-2">
            {searchTerm ? 'No APIs found' : 'No APIs yet'}
          </h3>
          <p className="text-muted-foreground mb-6">
            {searchTerm 
              ? 'Try adjusting your search terms'
              : 'Create your first mock API to get started'
            }
          </p>
          {!searchTerm && (
            <Link to="/apis/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First API
              </Button>
            </Link>
          )}
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the API "{apiToDelete?.name}" and all its endpoints and mock data. 
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
    </div>
  );
};