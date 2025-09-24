import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { apisAPI } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

const createAPISchema = z.object({
  name: z.string().min(1, 'API name is required').max(100, 'Name too long'),
  version: z.string().min(1, 'Version is required').regex(/^\d+\.\d+\.\d+$/, 'Version must be in format x.y.z'),
  base_path: z.string().min(2, 'Base path is required').regex(/^\//, 'Base path must start with /'),
  description: z.string().max(500, 'Description too long'),
  is_public: z.boolean(),
});

type CreateAPIFormValues = z.infer<typeof createAPISchema>;

export const CreateAPIForm = () => {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const form = useForm<CreateAPIFormValues>({
    resolver: zodResolver(createAPISchema),
    defaultValues: {
      name: '',
      version: '1.0.0',
      base_path: '/',
      description: '',
      is_public: true,
    },
  });

  const onSubmit = async (values: CreateAPIFormValues) => {
    setIsLoading(true);
    try {
      const response = await apisAPI.create({
        name: values.name,
        version: values.version,
        base_path: values.base_path,
        description: values.description,
        is_public: values.is_public,
      });
      toast({
        title: "API created successfully",
        description: `${values.name} has been created`,
      });
      navigate(`/apis/${response.data.id}`);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to create API",
        description: error.response?.data?.message || "Something went wrong",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Create New API</h1>
        <p className="text-muted-foreground mt-1">
          Set up a new mock API with custom endpoints and schemas
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>API Configuration</CardTitle>
          <CardDescription>
            Configure the basic settings for your new mock API
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>API Name</FormLabel>
                    <FormControl>
                      <Input placeholder="My Awesome API" {...field} />
                    </FormControl>
                    <FormDescription>
                      A descriptive name for your API
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="version"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Version</FormLabel>
                      <FormControl>
                        <Input placeholder="1.0.0" {...field} />
                      </FormControl>
                      <FormDescription>
                        Semantic version (x.y.z)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="base_path"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Base Path</FormLabel>
                      <FormControl>
                        <Input placeholder="/api/v1" {...field} />
                      </FormControl>
                      <FormDescription>
                        URL prefix for all endpoints
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe what your API does..."
                        className="min-h-[100px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      A detailed description of your API's purpose and functionality
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="is_public"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Public API</FormLabel>
                      <FormDescription>
                        Make this API publicly accessible to anyone with the link
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="flex items-center space-x-4 pt-4">
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Creating...' : 'Create API'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate('/apis')}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};