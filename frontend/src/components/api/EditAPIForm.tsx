import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Save } from 'lucide-react';
import { apisAPI, API } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export const EditAPIForm = () => {
  const { apiId } = useParams<{ apiId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [api, setApi] = useState<API | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    version: '',
    base_path: '',
    description: '',
    is_public: false,
  });

  useEffect(() => {
    if (apiId) {
      loadAPI();
    }
  }, [apiId]);

  const loadAPI = async () => {
    if (!apiId) return;
    
    try {
      const response = await apisAPI.getAPI(apiId);
      const apiData = response.data;
      setApi(apiData);
      setFormData({
        name: apiData.name,
        version: apiData.version,
        base_path: apiData.base_path,
        description: apiData.description,
        is_public: apiData.is_public,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load API details",
      });
      navigate('/apis');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiId) return;

    setIsSaving(true);
    try {
      await apisAPI.updateAPI(apiId, formData);
      toast({
        title: "API updated",
        description: "Your API has been updated successfully",
      });
      navigate(`/apis/${apiId}`);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Update failed",
        description: error.response?.data?.message || "Failed to update API",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    );
  }

  if (!api) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card className="p-12 text-center">
            <h3 className="text-lg font-semibold mb-2">API not found</h3>
            <p className="text-muted-foreground mb-6">
              The API you're trying to edit doesn't exist or you don't have permission to edit it
            </p>
            <Button onClick={() => navigate('/apis')}>
              Back to APIs
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <Button variant="ghost" className="mb-6" onClick={() => navigate(`/apis/${apiId}`)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to API Details
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Edit API</CardTitle>
            <CardDescription>
              Update your API configuration and settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">API Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="My Awesome API"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="version">Version *</Label>
                  <Input
                    id="version"
                    value={formData.version}
                    onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                    placeholder="1.0.0"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="base_path">Base Path *</Label>
                <Input
                  id="base_path"
                  value={formData.base_path}
                  onChange={(e) => setFormData({ ...formData, base_path: e.target.value })}
                  placeholder="/api/v1"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Must start with / (e.g., /api/v1, /myapi)
                </p>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe what your API does..."
                  rows={3}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_public"
                  checked={formData.is_public}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_public: checked })}
                />
                <Label htmlFor="is_public">Make this API public</Label>
              </div>
              <p className="text-xs text-muted-foreground">
                Public APIs can be accessed by anyone with the URL
              </p>

              <div className="flex justify-end space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate(`/apis/${apiId}`)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving}>
                  <Save className="mr-2 h-4 w-4" />
                  {isSaving ? 'Updating...' : 'Update API'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};