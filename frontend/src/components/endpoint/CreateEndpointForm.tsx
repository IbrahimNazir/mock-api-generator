import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
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
import { SchemaBuilder } from './SchemaBuilder';
import { Endpoint, endpointsAPI } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { AxiosResponse } from 'axios';

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

const createEndpointSchema = z.object({
  path: z.string().min(2, 'Path is required').regex(/^\//, 'Path must start with /'),
  methods: z.array(z.string()).min(1, 'At least one HTTP method is required'),
  description: z.string().max(500, 'Description too long'),
  mock_enabled: z.boolean(),
  mock_count: z.number().min(1, 'Mock count must be at least 1').max(25000, 'Mock count cannot exceed 25000'),
  faker_seed: z.union([z.string(), z.number()]),
});

type CreateEndpointFormValues = z.infer<typeof createEndpointSchema>;

export const CreateEndpointForm = () => {
  const { apiId } = useParams<{ apiId: string }>();
  const [endpointsByApiId, setEndpointsByApiId]  = useState<Endpoint[]>();
  const [isLoading, setIsLoading] = useState(false);
  const [schema, setSchema] = useState({
    type: 'object',
    properties: {},
    required: [],
  });
  const navigate = useNavigate();
  const { toast } = useToast();

  const form = useForm<CreateEndpointFormValues>({
    resolver: zodResolver(createEndpointSchema),
    defaultValues: {
      path: '/',
      methods: ['GET'],
      description: '',
      mock_enabled: true,
      mock_count: 5,
      faker_seed: Math.floor(Math.random() * 1000),
    },
  });
  const fetchEndpointByApi = async () => {
    try {
      const endpoints = await endpointsAPI.getByAPI(apiId);
      setEndpointsByApiId(endpoints.data);
    } catch (error: any) {
      toast({
        title: 'Error occurred while fetching endpoints',
        description: '',
      });
    }
  }
  useEffect(()=>{fetchEndpointByApi()}, [apiId]);

  const onSubmit = async (values: CreateEndpointFormValues) => {
    if (!apiId) return;

    setIsLoading(true);
    try {
      const response = await endpointsAPI.create({
        api_id: apiId,
        path: values.path,
        methods: values.methods,
        description: values.description,
        mock_enabled: values.mock_enabled,
        mock_count: values.mock_count,
        faker_seed: values.faker_seed,
        schema,
      });
      
      toast({
        title: "Endpoint created successfully",
        description: `${values.path} endpoint has been created with ${response.data.resources.length} mock records`,
      });
      
      navigate(`/apis/${apiId}`);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to create endpoint",
        description: error.response?.data?.message || "Something went wrong",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Memoize onSchemaChange to provide a stable reference
  const onSchemaChange = useCallback((newSchema: {
    type: 'object',
    properties: {},
    required: [],
  }) => {
    setSchema(newSchema); // Update parent state
  }, []); // Empty dependency array if schema update is the only concern

  const addDefaultProperties = () => {
    setSchema({
      type: 'object',
      properties: {
        id: {
          name: 'id',
          type: 'string',
          format: 'uuid',
          faker: 'string.uuid',
          required: true,
        },
        name: {
          name: 'name',
          type: 'string',
          faker: 'person.fullName',
          required: true,
        },
        email: {
          name: 'email',
          type: 'string',
          format: 'email',
          faker: 'internet.email',
          required: false,
        },
        created_at: {
          name: 'created_at',
          type: 'string',
          format: 'date-time',
          faker: 'date.recent',
          required: false,
        },
      },
      required: ['id', 'name'],
    });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Create New Endpoint</h1>
        <p className="text-muted-foreground mt-1">
          Define a new endpoint with custom schema and mock data generation
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>Endpoint Configuration</CardTitle>
            <CardDescription>
              Set up the basic endpoint settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="path"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Endpoint Path</FormLabel>
                      <FormControl>
                        <Input placeholder="/users" {...field} />
                      </FormControl>
                      <FormDescription>
                        The URL path for this endpoint
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="methods"
                  render={() => (
                    <FormItem>
                      <FormLabel>HTTP Methods</FormLabel>
                      <div className="grid grid-cols-3 gap-4">
                        {HTTP_METHODS.map((method) => (
                          <FormField
                            key={method}
                            control={form.control}
                            name="methods"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(method)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...field.value, method])
                                        : field.onChange(
                                            field.value?.filter((value) => value !== method)
                                          );
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="text-sm font-normal">
                                  {method}
                                </FormLabel>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe what this endpoint does..."
                          className="min-h-[80px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="mock_enabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Enable Mock Data</FormLabel>
                        <FormDescription>
                          Generate fake data for this endpoint
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

                {form.watch('mock_enabled') && (
                  <>
                    <FormField
                      control={form.control}
                      name="mock_count"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mock Data Count</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="1" 
                              max="100"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                            />
                          </FormControl>
                          <FormDescription>
                            Number of mock records to generate (1-100)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="faker_seed"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Faker Seed</FormLabel>
                          <FormControl>
                            <Input 
                              {...field}
                              onChange={(e) => field.onChange(e.target.value)}
                            />
                          </FormControl>
                          <FormDescription>
                            Seed for consistent fake data generation
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                <div className="flex items-center space-x-4 pt-4">
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? 'Creating...' : 'Create Endpoint'}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => navigate(`/apis/${apiId}`)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Schema Builder */}
        <Card>
          <CardHeader>
            <CardTitle>Response Schema</CardTitle>
            <CardDescription>
              Define the structure of your endpoint's response data
            </CardDescription>
            <div>
              <Button
                variant="outline"
                size="sm"
                onClick={addDefaultProperties}
              >
                Add Default Properties
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <SchemaBuilder
              schema={schema}
              onSchemaChange={onSchemaChange}
              availableEndpoints={endpointsByApiId}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};