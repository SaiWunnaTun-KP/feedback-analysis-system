import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { HelpCircle, FileText, MessageSquare, Mail, Search, Loader2, Download, ThumbsUp, ThumbsDown, Phone, MapPin, Clock } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { feedbacksApi, faqsApi } from '@/services/api';
import { useQuery } from '@tanstack/react-query';

export default function HelpSupport() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [faqSearch, setFaqSearch] = useState('');

  const { data: faqsResponse, isLoading: faqsLoading } = useQuery({
    queryKey: ['publicFaqs'],
    queryFn: faqsApi.getPublic,
  });

  const faqs: any[] = faqsResponse?.data || [];

  const filteredFaqs = faqs.filter((faq: any) => 
    faq.question.toLowerCase().includes(faqSearch.toLowerCase()) || 
    faq.answer.toLowerCase().includes(faqSearch.toLowerCase())
  );

  const handleContactSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const form = e.currentTarget;
    const subject = (form.elements.namedItem('subject') as HTMLInputElement).value;
    const message = (form.elements.namedItem('message') as HTMLTextAreaElement).value;

    try {
      await feedbacksApi.submit({ subject, message });
      toast.success('Your message has been sent to support. We will get back to you shortly.');
      form.reset();
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadTemplate = () => {
    const csvContent = "Product_Name,Review_Text\nSample Product,This is a great product!";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "Feedback_Template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Template downloaded successfully!');
  };

  return (
    <div className="space-y-12 max-w-5xl mx-auto pb-12">
      {/* Page Header */}
      <div className="text-center space-y-3">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">Help & Support</h1>
        <p className="text-lg text-slate-500 max-w-2xl mx-auto">
          Find answers, learn how to format your data, or get in touch with our team. We're here to help you get the most out of our AI tools.
        </p>
      </div>

      <div className="space-y-10">
        {/* Section 1: CSV Formatting Guide (Full Width) */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <FileText className="h-6 w-6 text-blue-600" />
            <h2 className="text-2xl font-semibold text-slate-900">Data Formatting Guide</h2>
          </div>
          <Card className="shadow-sm border-slate-200">
            <CardContent className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                <div className="space-y-5">
                  <div>
                    <h3 className="text-lg font-medium text-slate-900 mb-2">Preparing your CSV</h3>
                    <p className="text-slate-600 leading-relaxed text-sm">
                      To ensure the AI model accurately analyzes your customer feedback, your CSV file must be formatted correctly. We recommend downloading our template to get started quickly.
                    </p>
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="font-medium text-slate-900 flex items-center gap-2">
                      <HelpCircle className="h-4 w-4 text-amber-500" />
                      Important Tips:
                    </h4>
                    <ul className="list-disc pl-6 space-y-2 text-sm text-slate-600">
                      <li>Ensure the file is saved as a comma-separated values <strong>(CSV)</strong> format, not Excel (.xlsx).</li>
                      <li>The AI model currently performs best with <strong>English language</strong> reviews.</li>
                      <li>Remove any rows with empty <code className="text-xs bg-slate-100 px-1 py-0.5 rounded text-slate-700">Review_Text</code> before uploading to save your quota.</li>
                    </ul>
                  </div>

                  <Button 
                    variant="default" 
                    className="mt-2 w-full sm:w-auto gap-2 bg-blue-600 hover:bg-blue-700 active:scale-95 transition-transform" 
                    onClick={handleDownloadTemplate}
                  >
                    <Download className="h-4 w-4" />
                    Download Example Template
                  </Button>
                </div>

                <div className="bg-slate-900 text-slate-300 p-6 rounded-xl border border-slate-800 shadow-inner h-full">
                  <h4 className="font-semibold text-white mb-4 text-base">Required Columns</h4>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <code className="text-blue-400 font-mono font-medium bg-blue-950/50 px-2.5 py-1 rounded border border-blue-900/50 text-sm block w-max">Product_Name</code>
                      <p className="text-slate-400 text-sm">The name or ID of the product being reviewed.</p>
                    </div>
                    <div className="space-y-1.5">
                      <code className="text-blue-400 font-mono font-medium bg-blue-950/50 px-2.5 py-1 rounded border border-blue-900/50 text-sm block w-max">Review_Text</code>
                      <p className="text-slate-400 text-sm">The actual text of the customer's review or feedback.</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Section 2: FAQs */}
        <section>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-6 w-6 text-blue-600" />
              <h2 className="text-2xl font-semibold text-slate-900">Frequently Asked Questions</h2>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Search questions..." 
                className="pl-9 bg-white border-slate-200 focus-visible:ring-blue-500 rounded-full"
                value={faqSearch}
                onChange={(e) => setFaqSearch(e.target.value)}
              />
            </div>
          </div>
          
          <Card className="shadow-sm border-slate-200">
            <CardContent className="p-2 sm:p-6">
              {faqsLoading ? (
                <div className="text-center py-8 text-slate-500">Loading FAQs...</div>
              ) : filteredFaqs.length > 0 ? (
                <Accordion type="single" collapsible className="w-full">
                  {filteredFaqs.map((faq) => (
                    <AccordionItem key={faq.faqId || faq.id} value={`faq-${faq.faqId || faq.id}`} className="border-b-slate-100 last:border-0 px-2">
                      <AccordionTrigger className="text-left font-medium text-slate-800 hover:text-blue-600 transition-colors text-base py-4">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-slate-600 leading-relaxed pb-5 text-sm">
                        <p>{faq.answer}</p>
                        <div className="mt-4 flex items-center gap-3 text-xs font-medium text-slate-400 bg-slate-50 p-2 rounded-md w-max">
                          <span>Was this helpful?</span>
                          <button className="hover:text-blue-600 hover:bg-blue-100 p-1 rounded transition-colors"><ThumbsUp className="h-3.5 w-3.5" /></button>
                          <button className="hover:text-red-600 hover:bg-red-100 p-1 rounded transition-colors"><ThumbsDown className="h-3.5 w-3.5" /></button>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              ) : (
                <div className="text-center py-12 text-slate-500">
                  <Search className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-base">No FAQs found matching "{faqSearch}"</p>
                  <Button variant="link" onClick={() => setFaqSearch('')}>Clear search</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Section 3: Contact Us */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Mail className="h-6 w-6 text-blue-600" />
            <h2 className="text-2xl font-semibold text-slate-900">Get in Touch</h2>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            
            {/* Direct Contact Info */}
            <Card className="lg:col-span-2 shadow-sm border-slate-200 bg-slate-50">
              <CardHeader>
                <CardTitle className="text-lg">Contact Information</CardTitle>
                <CardDescription>Prefer to reach out directly? Here is how you can find us.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-white rounded-full border border-slate-200 shadow-sm text-blue-600">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900 text-sm">Email Support</h4>
                    <p className="text-slate-500 text-sm mt-0.5">support@feedbackai.com</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-white rounded-full border border-slate-200 shadow-sm text-blue-600">
                    <Phone className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900 text-sm">Phone</h4>
                    <p className="text-slate-500 text-sm mt-0.5">+1 (800) 123-4567</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="p-2 bg-white rounded-full border border-slate-200 shadow-sm text-blue-600">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900 text-sm">Working Hours</h4>
                    <p className="text-slate-500 text-sm mt-0.5">Mon - Fri: 9:00 AM - 6:00 PM EST</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-white rounded-full border border-slate-200 shadow-sm text-blue-600">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900 text-sm">Office</h4>
                    <p className="text-slate-500 text-sm mt-0.5">123 AI Boulevard, Tech Park<br/>San Francisco, CA 94105</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contact Form */}
            <Card className="lg:col-span-3 shadow-md border-slate-200">
              <CardHeader>
                <CardTitle className="text-lg">Send us a message</CardTitle>
                <CardDescription>Fill out the form below and we'll reply within 24 hours.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleContactSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="subject" className="text-slate-700">Subject</Label>
                    <Input 
                      id="subject" 
                      placeholder="e.g., Question about my quota" 
                      required 
                      className="bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="message" className="text-slate-700">Message</Label>
                    <Textarea 
                      id="message" 
                      placeholder="Describe your issue or question in detail..." 
                      className="min-h-[160px] bg-white resize-none"
                      required 
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button 
                      type="submit" 
                      className="w-full sm:w-auto px-8 active:scale-95 transition-transform" 
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        'Submit'
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
            
          </div>
        </section>
      </div>
    </div>
  );
}
