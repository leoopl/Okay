'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ApiClient, ApiErrorType } from '@/lib/api-client';
import { useRouter } from 'next/navigation';
import { ProtectedContent } from '@/components/common/auth/protected-route';
import { formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';
import { toast, Toaster } from 'sonner';

enum TestimonialStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

interface Testimonial {
  id: string;
  message: string;
  email: string;
  location?: string;
  status: TestimonialStatus;
  createdAt: string;
  approvedAt?: string;
  newsletter: boolean;
}

export default function AdminTestimonialsPage() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const router = useRouter();

  // Fetch testimonials on component mount
  useEffect(() => {
    fetchTestimonials();
  }, []);

  async function fetchTestimonials() {
    setIsLoading(true);
    try {
      const data = await ApiClient.get<Testimonial[]>('admin/testimonials');
      setTestimonials(data);
    } catch (error) {
      console.error('Error fetching testimonials:', error);

      // If unauthorized, redirect to login
      if ((error as { type: ApiErrorType }).type === ApiErrorType.AUTH) {
        router.push('/signin?returnUrl=/admin/testimonials');
      }

      toast.error('Error', {
        description: 'Failed to load testimonials',
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function approveTestimonial(id: string) {
    try {
      await ApiClient.patch(`admin/testimonials/${id}/approve`);

      // Update local state
      setTestimonials((prev) =>
        prev.map((t) =>
          t.id === id
            ? { ...t, status: TestimonialStatus.APPROVED, approvedAt: new Date().toISOString() }
            : t,
        ),
      );

      toast.success('Success', {
        description: 'Testimonial approved successfully',
      });
    } catch (error) {
      console.error('Error approving testimonial:', error);
      toast.error('Error', {
        description: 'Failed to approve testimonial',
      });
    }
  }

  async function rejectTestimonial(id: string) {
    try {
      await ApiClient.patch(`admin/testimonials/${id}/reject`);

      // Update local state
      setTestimonials((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: TestimonialStatus.REJECTED } : t)),
      );

      toast.success('Success', {
        description: 'Testimonial rejected successfully',
      });
    } catch (error) {
      console.error('Error rejecting testimonial:', error);
      toast.error('Error', {
        description: 'Failed to reject testimonial',
      });
    }
  }

  async function deleteTestimonial(id: string) {
    if (!confirm('Are you sure you want to delete this testimonial?')) {
      return;
    }

    try {
      await ApiClient.delete(`admin/testimonials/${id}`);

      // Update local state
      setTestimonials((prev) => prev.filter((t) => t.id !== id));

      toast.success('Success', {
        description: 'Testimonial deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting testimonial:', error);
      toast.error('Error', {
        description: 'Failed to delete testimonial',
      });
    }
  }

  // Filter testimonials based on active tab
  const filteredTestimonials = testimonials.filter((t) => {
    if (activeTab === 'all') return true;
    return t.status.toLowerCase() === activeTab;
  });

  return (
    <ProtectedContent requiredRole="admin" fallback={<div>Access Denied</div>}>
      <Toaster richColors position="top-center" closeButton={false} />
      <div className="container mx-auto py-10">
        <h1 className="mb-6 text-3xl font-bold">Testimonial Management</h1>

        <Tabs defaultValue="pending" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-4">
            {isLoading ? (
              <div className="flex justify-center p-10">
                <div className="border-primary h-10 w-10 animate-spin rounded-full border-4 border-t-transparent"></div>
              </div>
            ) : filteredTestimonials.length === 0 ? (
              <div className="bg-muted/50 rounded-lg p-10 text-center">
                <p className="text-lg font-medium">No {activeTab} testimonials found</p>
              </div>
            ) : (
              filteredTestimonials.map((testimonial) => (
                <Card key={testimonial.id} className="overflow-hidden">
                  <CardHeader className="bg-muted/30 flex flex-row items-start justify-between pb-2">
                    <div>
                      <CardTitle className="text-lg">
                        {testimonial.email}
                        {testimonial.newsletter && (
                          <Badge className="bg-blue-light text-blue-dark ml-2">Newsletter</Badge>
                        )}
                      </CardTitle>
                      <CardDescription>
                        {testimonial.location || 'No location'} •
                        {formatDistanceToNow(new Date(testimonial.createdAt), {
                          addSuffix: true,
                          locale: pt,
                        })}
                      </CardDescription>
                    </div>
                    <Badge
                      className={
                        testimonial.status === TestimonialStatus.PENDING
                          ? 'bg-yellow-light text-yellow-dark'
                          : testimonial.status === TestimonialStatus.APPROVED
                            ? 'bg-green-light text-green-dark'
                            : 'bg-destructive/20 text-destructive'
                      }
                    >
                      {testimonial.status}
                    </Badge>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <p className="whitespace-pre-wrap text-gray-700">{testimonial.message}</p>
                  </CardContent>
                  <CardFooter className="bg-muted/20 flex justify-end gap-2 pt-2">
                    {testimonial.status === TestimonialStatus.PENDING && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-destructive text-destructive hover:bg-destructive/10"
                          onClick={() => rejectTestimonial(testimonial.id)}
                        >
                          Reject
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-green-dark text-green-dark hover:bg-green-light/50"
                          onClick={() => approveTestimonial(testimonial.id)}
                        >
                          Approve
                        </Button>
                      </>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => deleteTestimonial(testimonial.id)}
                    >
                      Delete
                    </Button>
                  </CardFooter>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </ProtectedContent>
  );
}
