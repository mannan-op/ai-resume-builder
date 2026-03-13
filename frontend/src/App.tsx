import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Download, Briefcase, User, Sparkles } from 'lucide-react';
import { PDFDownloadLink, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  targetRole: z.string().min(1, "Target role is required"),
  experience: z.string().min(10, "Experience details required"),
  skills: z.string().min(5, "Skills required"),
});

type FormData = z.infer<typeof formSchema>;

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 12 },
  header: { fontSize: 24, marginBottom: 20, textAlign: 'center' },
  section: { marginBottom: 15 },
  title: { fontSize: 16, marginBottom: 8, fontWeight: 'bold' },
});

const ResumePDF = ({ data, improved }: { data: FormData; improved: string }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <Text style={styles.header}>{data.name}</Text>
      <Text style={{ textAlign: 'center', marginBottom: 20 }}>{data.targetRole}</Text>
      
      <View style={styles.section}>
        <Text style={styles.title}>Professional Summary</Text>
        <Text>{improved.split('\n')[0] || 'Expert professional with strong background.'}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.title}>Experience</Text>
        <Text>{improved}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.title}>Skills</Text>
        <Text>{data.skills}</Text>
      </View>
    </Page>
  </Document>
);

export default function App() {
  const [improvedResume, setImprovedResume] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPortfolio, setShowPortfolio] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '', targetRole: '', experience: '', skills: '' },
  });

  const onSubmit = async (values: FormData) => {
    setLoading(true);
    try {
      const res = await axios.post('http://localhost:3000/api/resume', values);
      setImprovedResume(res.data.improvedResume);
    } catch (err) {
      alert('Error connecting to backend. Make sure backend is running!');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-5xl font-bold text-center mb-2 flex items-center justify-center gap-3">
          <Sparkles className="text-yellow-400" /> AI Resume Builder
        </h1>
        <p className="text-center text-gray-400 mb-10">Powered by Groq • Built with React</p>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Form Card */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><User /> Enter Your Details</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl><Input placeholder="Abdul Rehman" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="targetRole"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Target Job Role</FormLabel>
                        <FormControl><Input placeholder="Senior Full-Stack AI Engineer" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="experience"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Experience (paste your current bullets)</FormLabel>
                        <FormControl><Textarea rows={6} placeholder="• Built 10+ web apps..." {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="skills"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Skills (comma separated)</FormLabel>
                        <FormControl><Input placeholder="React, TypeScript, Node.js, Groq, AI Agents" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Generating with AI...' : 'Improve with Groq AI'}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Preview Card */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Briefcase /> AI Improved Resume</CardTitle>
            </CardHeader>
            <CardContent className="min-h-[400px]">
              {improvedResume ? (
                <div className="prose prose-invert max-w-none">
                  <pre className="whitespace-pre-wrap text-sm bg-gray-950 p-6 rounded-lg border border-gray-700 overflow-auto h-96">
                    {improvedResume}
                  </pre>

                  <div className="flex gap-3 mt-6">
                    {/* PDF Download */}
                    <PDFDownloadLink
                      document={<ResumePDF data={form.getValues()} improved={improvedResume} />}
                      fileName={`${form.getValues().name}-AI-Resume.pdf`}
                      className="flex-1"
                    >
                      {({ loading }) => (
                        <Button disabled={loading} className="w-full">
                          <Download className="mr-2" /> {loading ? 'Preparing PDF...' : 'Download PDF Resume'}
                        </Button>
                      )}
                    </PDFDownloadLink>

                    {/* Portfolio Button */}
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setShowPortfolio(!showPortfolio)}
                    >
                      Generate Portfolio Preview
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="h-96 flex items-center justify-center text-gray-500">
                  Fill form and click "Improve with Groq AI"
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Portfolio Preview */}
        {showPortfolio && improvedResume && (
          <Card className="mt-8 bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle>One-Click Portfolio Preview</CardTitle>
            </CardHeader>
            <CardContent className="p-8 bg-gradient-to-br from-gray-950 to-black rounded-xl">
              <h2 className="text-4xl font-bold mb-2">{form.getValues().name}</h2>
              <p className="text-xl text-yellow-400 mb-8">{form.getValues().targetRole}</p>
              
              <div className="prose prose-invert">
                <h3 className="text-2xl mb-4">About Me</h3>
                <p>{improvedResume.split('\n')[0]}</p>

                <h3 className="text-2xl mt-8 mb-4">Experience</h3>
                <div className="text-sm whitespace-pre-wrap">{improvedResume}</div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}