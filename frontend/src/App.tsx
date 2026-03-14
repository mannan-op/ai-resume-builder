import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Download,
  Briefcase,
  User,
  Sparkles,
  Sun,
  Moon,
  Target,
  FileText,
  Code2,
  Wand2,
  Eye,
  ListChecks,
  FolderKanban,
  Mail,
  Phone,
  Send,
  BadgeCheck,
  Plus,
  Trash2,
} from "lucide-react";
import {
  PDFDownloadLink,
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  targetRole: z.string().min(1, "Target role is required"),
  experience: z.string().min(10, "Experience details required"),
  skills: z.string().min(5, "Skills required"),
});

type FormData = z.infer<typeof formSchema>;
type Theme = "light" | "dark";
type AdditionalField = { id: string; label: string; value: string };

const FORM_STORAGE_KEY = "resumeFormData";
const IMPROVED_RESUME_STORAGE_KEY = "improvedResume";
const ADDITIONAL_FIELDS_STORAGE_KEY = "resumeAdditionalFields";
const ADDITIONAL_FIELD_OPTIONS = [
  "Education",
  "Certifications",
  "Awards",
  "Languages",
  "LinkedIn",
  "GitHub",
  "Portfolio",
  "Volunteer Work",
  "Publications",
  "Other",
];

// ── PDF design tokens ──────────────────────────────────────────────────────
const BRAND = "#1a3a5c";
const ACCENT = "#93c5fd";
const TEXT_DARK = "#1e293b";
const SIDEBAR_BG = "#162d47";
const SIDEBAR_TEXT = "#cbd5e1";

const pdfStyles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 11,
    backgroundColor: "#ffffff",
    flexDirection: "column",
  },

  // ── Full-width header ──
  header: {
    backgroundColor: BRAND,
    paddingTop: 28,
    paddingBottom: 24,
    paddingLeft: 36,
    paddingRight: 36,
  },
  headerName: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 5,
    letterSpacing: 0.5,
  },
  headerRole: { fontSize: 12, color: ACCENT, letterSpacing: 0.8 },

  // ── Two-column body ──
  columns: { flexDirection: "row", flex: 1 },

  // Left sidebar
  sidebar: {
    width: "31%",
    backgroundColor: SIDEBAR_BG,
    paddingTop: 22,
    paddingBottom: 28,
    paddingLeft: 18,
    paddingRight: 16,
  },
  sidebarSection: { marginBottom: 22 },
  sidebarHeading: {
    fontSize: 8.5,
    fontWeight: "bold",
    color: ACCENT,
    letterSpacing: 1.6,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: ACCENT,
    borderBottomStyle: "solid",
  },
  sidebarItem: {
    flexDirection: "row",
    marginBottom: 6,
    alignItems: "flex-start",
  },
  sidebarDot: { width: 10, fontSize: 14, color: ACCENT, lineHeight: 1.1 },
  sidebarText: {
    flex: 1,
    fontSize: 9.5,
    color: SIDEBAR_TEXT,
    lineHeight: 1.55,
  },

  // Right main content
  main: {
    flex: 1,
    paddingTop: 22,
    paddingBottom: 28,
    paddingLeft: 24,
    paddingRight: 28,
  },
  section: { marginBottom: 15 },
  sectionHeading: {
    fontSize: 9.5,
    fontWeight: "bold",
    color: BRAND,
    letterSpacing: 1.4,
    marginBottom: 6,
    paddingBottom: 3,
    borderBottomWidth: 1.5,
    borderBottomColor: BRAND,
    borderBottomStyle: "solid",
  },
  paragraph: {
    fontSize: 10,
    color: TEXT_DARK,
    lineHeight: 1.65,
    marginBottom: 3,
  },
  bulletRow: {
    flexDirection: "row",
    marginBottom: 5,
    alignItems: "flex-start",
  },
  bulletAccent: {
    width: 13,
    fontSize: 14,
    color: BRAND,
    marginTop: -1,
    lineHeight: 1.2,
  },
  bulletText: { flex: 1, fontSize: 10, color: TEXT_DARK, lineHeight: 1.55 },
});

// ── Markdown parser ─────────────────────────────────────────────────────────
type SectionItem = { type: "bullet" | "text"; content: string };
type ResumeSection = { title: string; items: SectionItem[] };

function isSectionHeading(line: string): boolean {
  const t = line.trim();
  return (
    /^#{1,3}\s+\S/.test(t) ||
    /^\*\*[^*]{3,}\*\*\s*$/.test(t) ||
    /^[A-Z][A-Z\s&/\-]{3,}:?\s*$/.test(t)
  );
}

function cleanHeading(line: string): string {
  return line
    .replace(/^#+\s+/, "")
    .replace(/\*\*/g, "")
    .replace(/:$/, "")
    .trim()
    .toUpperCase();
}

function isBullet(line: string): boolean {
  return /^\s*[-•*]\s/.test(line) || /^\s*\d+\.\s/.test(line);
}

function cleanBullet(line: string): string {
  return line
    .replace(/^\s*[-•*]\s+/, "")
    .replace(/^\s*\d+\.\s+/, "")
    .replace(/\*\*/g, "")
    .trim();
}

function stripMd(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .trim();
}

function parseResume(text: string): ResumeSection[] {
  const sections: ResumeSection[] = [];
  let cur: ResumeSection | null = null;

  for (const rawLine of text.split("\n")) {
    const line = rawLine.trimEnd();
    if (!line.trim()) continue;

    if (isSectionHeading(line)) {
      if (cur) sections.push(cur);
      cur = { title: cleanHeading(line), items: [] };
    } else {
      if (!cur) cur = { title: "", items: [] };
      cur.items.push(
        isBullet(line)
          ? { type: "bullet", content: cleanBullet(line) }
          : { type: "text", content: stripMd(line) },
      );
    }
  }
  if (cur) sections.push(cur);
  return sections;
}

// ── ResumePDF component ─────────────────────────────────────────────────────
const ResumePDF = ({
  data,
  improved,
}: {
  data: FormData;
  improved: string;
}) => {
  const sections = parseResume(improved);

  const skillSections = sections.filter((s) => /skill/i.test(s.title));
  const mainSections = sections.filter((s) => !/skill/i.test(s.title));

  // Skills list: prefer AI-generated, fall back to form input
  const skillsList =
    skillSections.length > 0
      ? skillSections.flatMap((sec) =>
          sec.items.flatMap((item) =>
            item.type === "text"
              ? item.content
                  .split(/[,|•\/]/)
                  .map((s) => s.trim())
                  .filter(Boolean)
              : [item.content],
          ),
        )
      : data.skills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);

  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        {/* ── Full-width header ── */}
        <View style={pdfStyles.header}>
          <Text style={pdfStyles.headerName}>{data.name}</Text>
          <Text style={pdfStyles.headerRole}>{data.targetRole}</Text>
        </View>

        {/* ── Two-column body ── */}
        <View style={pdfStyles.columns}>
          {/* Left sidebar */}
          <View style={pdfStyles.sidebar}>
            <View style={pdfStyles.sidebarSection}>
              <Text style={pdfStyles.sidebarHeading}>TECHNICAL SKILLS</Text>
              {skillsList.map((skill, i) => (
                <View key={i} style={pdfStyles.sidebarItem}>
                  <Text style={pdfStyles.sidebarDot}>·</Text>
                  <Text style={pdfStyles.sidebarText}>{skill}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Right main content */}
          <View style={pdfStyles.main}>
            {mainSections.map((section, i) => (
              <View key={i} style={pdfStyles.section}>
                {section.title ? (
                  <Text style={pdfStyles.sectionHeading}>{section.title}</Text>
                ) : null}
                {section.items.map((item, j) =>
                  item.type === "bullet" ? (
                    <View key={j} style={pdfStyles.bulletRow}>
                      <Text style={pdfStyles.bulletAccent}>›</Text>
                      <Text style={pdfStyles.bulletText}>{item.content}</Text>
                    </View>
                  ) : (
                    <Text key={j} style={pdfStyles.paragraph}>
                      {item.content}
                    </Text>
                  ),
                )}
              </View>
            ))}
          </View>
        </View>
      </Page>
    </Document>
  );
};

export default function App() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") {
      return "dark";
    }

    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "light" || savedTheme === "dark") {
      return savedTheme;
    }

    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });
  const [improvedResume, setImprovedResume] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPortfolio, setShowPortfolio] = useState(false);
  const [additionalFields, setAdditionalFields] = useState<AdditionalField[]>(
    [],
  );
  const [selectedAdditionalType, setSelectedAdditionalType] =
    useState<string>("Education");

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", targetRole: "", experience: "", skills: "" },
  });

  useEffect(() => {
    const rawForm = localStorage.getItem(FORM_STORAGE_KEY);
    if (rawForm) {
      try {
        const parsed = JSON.parse(rawForm) as Partial<FormData>;
        form.reset({
          name: typeof parsed.name === "string" ? parsed.name : "",
          targetRole:
            typeof parsed.targetRole === "string" ? parsed.targetRole : "",
          experience:
            typeof parsed.experience === "string" ? parsed.experience : "",
          skills: typeof parsed.skills === "string" ? parsed.skills : "",
        });
      } catch {
        localStorage.removeItem(FORM_STORAGE_KEY);
      }
    }

    const savedResume = localStorage.getItem(IMPROVED_RESUME_STORAGE_KEY);
    if (savedResume) {
      setImprovedResume(savedResume);
    }

    const savedAdditionalFields = localStorage.getItem(
      ADDITIONAL_FIELDS_STORAGE_KEY,
    );
    if (savedAdditionalFields) {
      try {
        const parsed = JSON.parse(savedAdditionalFields) as AdditionalField[];
        setAdditionalFields(
          parsed
            .filter((item) => item && typeof item.id === "string")
            .map((item) => ({
              id: item.id,
              label: typeof item.label === "string" ? item.label : "",
              value: typeof item.value === "string" ? item.value : "",
            })),
        );
      } catch {
        localStorage.removeItem(ADDITIONAL_FIELDS_STORAGE_KEY);
      }
    }
  }, [form]);

  useEffect(() => {
    const subscription = form.watch((values) => {
      localStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(values));
    });
    return () => subscription.unsubscribe();
  }, [form]);

  useEffect(() => {
    localStorage.setItem(IMPROVED_RESUME_STORAGE_KEY, improvedResume);
  }, [improvedResume]);

  useEffect(() => {
    localStorage.setItem(
      ADDITIONAL_FIELDS_STORAGE_KEY,
      JSON.stringify(additionalFields),
    );
  }, [additionalFields]);

  const onSubmit = async (values: FormData) => {
    const cleanedAdditionalFields = additionalFields
      .map((field) => ({
        label: field.label.trim(),
        value: field.value.trim(),
      }))
      .filter((field) => field.label && field.value);

    const getAdditionalValue = (fieldName: string) =>
      cleanedAdditionalFields.find(
        (field) => field.label.toLowerCase() === fieldName.toLowerCase(),
      )?.value || "";

    const payload = {
      ...values,
      education: getAdditionalValue("Education"),
      projects: getAdditionalValue("Projects"),
      achievements: getAdditionalValue("Achievements"),
      additionalFields: cleanedAdditionalFields,
    };

    setLoading(true);
    setImprovedResume("");

    try {
      const streamRes = await fetch(
        "http://localhost:3000/api/resume?mode=stream",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      if (!streamRes.ok || !streamRes.body) {
        throw new Error("Streaming unavailable");
      }

      const reader = streamRes.body.getReader();
      const decoder = new TextDecoder();
      let aggregated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        aggregated += decoder.decode(value, { stream: true });
        setImprovedResume(aggregated);
      }

      aggregated += decoder.decode();
      setImprovedResume(aggregated);
    } catch {
      try {
        const jsonRes = await fetch(
          "http://localhost:3000/api/resume?mode=json",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          },
        );

        if (!jsonRes.ok) {
          throw new Error("Fallback failed");
        }

        const data = (await jsonRes.json()) as { improvedResume?: string };
        setImprovedResume(data.improvedResume || "");
      } catch {
        alert("Error connecting to backend. Make sure backend is running!");
      }
    } finally {
      setLoading(false);
    }
  };

  const addAdditionalField = () => {
    setAdditionalFields((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        label: selectedAdditionalType,
        value: "",
      },
    ]);
  };

  const updateAdditionalField = (
    id: string,
    key: "label" | "value",
    nextValue: string,
  ) => {
    setAdditionalFields((prev) =>
      prev.map((field) =>
        field.id === id ? { ...field, [key]: nextValue } : field,
      ),
    );
  };

  const removeAdditionalField = (id: string) => {
    setAdditionalFields((prev) => prev.filter((field) => field.id !== id));
  };

  const portfolioSections = improvedResume ? parseResume(improvedResume) : [];
  const portfolioSummary =
    portfolioSections
      .find((section) => /summary|profile|about/i.test(section.title))
      ?.items.map((item) => item.content)
      .join(" ") ||
    improvedResume.split("\n").find((line) => line.trim()) ||
    "Experienced professional building impactful digital products.";

  const achievementItems =
    portfolioSections
      .find((section) =>
        /achievement|experience|impact|work/i.test(section.title),
      )
      ?.items.filter((item) => item.type === "bullet") || [];

  const allBulletItems = portfolioSections.flatMap((section) =>
    section.items.filter((item) => item.type === "bullet"),
  );

  const projectSources =
    achievementItems.length > 0 ? achievementItems : allBulletItems;

  const projectCards = projectSources.slice(0, 3).map((item, index) => ({
    title: `Project ${index + 1}`,
    description: item.content,
  }));

  const aiSkills = portfolioSections
    .filter((section) => /skill/i.test(section.title))
    .flatMap((section) => section.items)
    .flatMap((item) =>
      item.content
        .split(/[,|•\/]/)
        .map((skill) => skill.trim())
        .filter(Boolean),
    );

  const formSkills = form
    .getValues()
    .skills.split(",")
    .map((skill) => skill.trim())
    .filter(Boolean);

  const portfolioSkills = (aiSkills.length ? aiSkills : formSkills).slice(
    0,
    12,
  );

  const displayName = form.getValues().name || "Your Name";
  const displayRole = form.getValues().targetRole || "Professional";
  const defaultEmail = `${
    displayName
      .toLowerCase()
      .replace(/[^a-z\s]/g, "")
      .trim()
      .replace(/\s+/g, ".") || "your.name"
  }@portfolio.dev`;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 dark:bg-gray-950 dark:text-white p-8 transition-colors">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-end mb-4">
          <Button
            variant="outline"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? (
              <>
                <Sun className="mr-2 h-4 w-4" /> Switch to Light
              </>
            ) : (
              <>
                <Moon className="mr-2 h-4 w-4" /> Switch to Dark
              </>
            )}
          </Button>
        </div>
        <h1 className="text-5xl font-bold text-center mb-2 flex items-center justify-center gap-3">
          <Sparkles className="text-yellow-400" /> AI Resume Builder
        </h1>
        <p className="text-center text-slate-500 dark:text-gray-400 mb-10 flex items-center justify-center gap-2">
          <Wand2 className="h-4 w-4 text-amber-500" /> Powered by Groq • Built
          with React
        </p>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Form Card */}
          <Card className="bg-white border-slate-200 dark:bg-gray-900 dark:border-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User /> Enter Your Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-6"
                >
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <User className="h-4 w-4 text-sky-500" /> Full Name
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="Username" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="targetRole"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Target className="h-4 w-4 text-violet-500" /> Target
                          Job Role
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Senior Full-Stack AI Engineer"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="experience"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <ListChecks className="h-4 w-4 text-emerald-500" />
                          Experience (paste your current bullets)
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            rows={6}
                            placeholder="• Built 10+ web apps..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="skills"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Code2 className="h-4 w-4 text-cyan-500" /> Skills
                          (comma separated)
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="React, TypeScript, Node.js, Groq, AI Agents"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-gray-700 dark:bg-gray-950/50 space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <FormLabel className="m-0 flex items-center gap-2 text-sm font-semibold">
                        <FileText className="h-4 w-4 text-fuchsia-500" />
                        Additional Fields
                      </FormLabel>
                      <div className="flex items-center gap-2">
                        <select
                          value={selectedAdditionalType}
                          onChange={(e) =>
                            setSelectedAdditionalType(e.target.value)
                          }
                          className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                        >
                          {ADDITIONAL_FIELD_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={addAdditionalField}
                        >
                          <Plus className="mr-2 h-4 w-4" /> Add
                        </Button>
                      </div>
                    </div>

                    {additionalFields.length > 0 ? (
                      <div className="space-y-3">
                        {additionalFields.map((field) => (
                          <div
                            key={field.id}
                            className="space-y-2 rounded-lg border border-slate-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900"
                          >
                            <div className="flex items-center gap-2">
                              <Input
                                value={field.label}
                                onChange={(e) =>
                                  updateAdditionalField(
                                    field.id,
                                    "label",
                                    e.target.value,
                                  )
                                }
                                placeholder="Field name (e.g., Education)"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => removeAdditionalField(field.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                            <Textarea
                              rows={3}
                              value={field.value}
                              onChange={(e) =>
                                updateAdditionalField(
                                  field.id,
                                  "value",
                                  e.target.value,
                                )
                              }
                              placeholder="Add details for this field"
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500 dark:text-gray-400">
                        Add optional sections like Education, Certifications, or
                        Links to enrich the generated resume.
                      </p>
                    )}
                  </div>

                  <Button type="submit" className="w-full" disabled={loading}>
                    <Wand2 className="mr-2 h-4 w-4" />
                    {loading ? "Generating with AI..." : "Improve with Groq AI"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Preview Card */}
          <Card className="bg-white border-slate-200 dark:bg-gray-900 dark:border-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase /> AI Improved Resume
              </CardTitle>
            </CardHeader>
            <CardContent className="min-h-[400px]">
              {loading && !improvedResume ? (
                <div className="h-96 rounded-lg border border-slate-300 bg-white p-6 dark:border-gray-700 dark:bg-gray-950">
                  <div className="animate-pulse space-y-4">
                    <div className="h-5 w-1/3 rounded bg-slate-200 dark:bg-gray-800" />
                    <div className="space-y-2">
                      <div className="h-3 w-full rounded bg-slate-200 dark:bg-gray-800" />
                      <div className="h-3 w-11/12 rounded bg-slate-200 dark:bg-gray-800" />
                      <div className="h-3 w-10/12 rounded bg-slate-200 dark:bg-gray-800" />
                    </div>
                    <div className="pt-2">
                      <div className="h-4 w-1/4 rounded bg-slate-200 dark:bg-gray-800" />
                    </div>
                    <div className="space-y-2">
                      <div className="h-3 w-full rounded bg-slate-200 dark:bg-gray-800" />
                      <div className="h-3 w-full rounded bg-slate-200 dark:bg-gray-800" />
                      <div className="h-3 w-9/12 rounded bg-slate-200 dark:bg-gray-800" />
                      <div className="h-3 w-10/12 rounded bg-slate-200 dark:bg-gray-800" />
                    </div>
                    <p className="pt-4 text-sm text-slate-500 dark:text-gray-400">
                      Generating your AI-improved resume...
                    </p>
                  </div>
                </div>
              ) : improvedResume ? (
                <div className="prose prose-invert max-w-none">
                  <pre className="whitespace-pre-wrap text-sm bg-white text-slate-900 dark:bg-gray-950 dark:text-white p-6 rounded-lg border border-slate-300 dark:border-gray-700 overflow-auto h-96">
                    {improvedResume}
                  </pre>

                  {loading && (
                    <p className="mt-2 text-xs text-slate-500 dark:text-gray-400">
                      AI is still typing...
                    </p>
                  )}

                  <div className="flex gap-3 mt-6">
                    {/* PDF Download */}
                    <PDFDownloadLink
                      document={
                        <ResumePDF
                          data={form.getValues()}
                          improved={improvedResume}
                        />
                      }
                      fileName={`${form.getValues().name}-AI-Resume.pdf`}
                      className="flex-1"
                    >
                      {({ loading }) => (
                        <Button disabled={loading} className="w-full">
                          <Download className="mr-2" />{" "}
                          {loading ? "Preparing PDF..." : "Download PDF Resume"}
                        </Button>
                      )}
                    </PDFDownloadLink>

                    {/* Portfolio Button */}
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setShowPortfolio(!showPortfolio)}
                    >
                      <Eye className="mr-2 h-4 w-4" /> Generate Portfolio
                      Preview
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="h-96 flex flex-col items-center justify-center text-slate-500 dark:text-gray-500 gap-3">
                  <FileText className="h-10 w-10 text-slate-400 dark:text-gray-600" />
                  <p>Fill form and click "Improve with Groq AI"</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Portfolio Preview */}
        {showPortfolio && improvedResume && (
          <Card className="mt-8 bg-white border-slate-200 dark:bg-gray-900 dark:border-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-indigo-500" /> One-Click Portfolio
                Preview
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 rounded-xl overflow-hidden">
              <div className="bg-slate-950 text-slate-100">
                <div className="px-8 py-6 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-cyan-300 mb-2">
                      Portfolio Website
                    </p>
                    <h2 className="text-4xl font-bold">{displayName}</h2>
                    <p className="text-cyan-200 mt-2 flex items-center gap-2">
                      <Target className="h-4 w-4" /> {displayRole}
                    </p>
                  </div>
                  <div className="text-sm text-slate-300 flex gap-6">
                    <span className="flex items-center gap-2">
                      <User className="h-4 w-4 text-cyan-300" /> About
                    </span>
                    <span className="flex items-center gap-2">
                      <FolderKanban className="h-4 w-4 text-cyan-300" />{" "}
                      Projects
                    </span>
                    <span className="flex items-center gap-2">
                      <Code2 className="h-4 w-4 text-cyan-300" /> Skills
                    </span>
                    <span className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-cyan-300" /> Contact
                    </span>
                  </div>
                </div>

                <div className="p-8 space-y-10 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
                  <section className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-6">
                    <h3 className="text-2xl font-semibold mb-3 flex items-center gap-2 text-cyan-200">
                      <User className="h-6 w-6" /> About
                    </h3>
                    <p className="text-slate-200 leading-7">
                      {portfolioSummary}
                    </p>
                  </section>

                  <section>
                    <h3 className="text-2xl font-semibold mb-4 flex items-center gap-2 text-cyan-200">
                      <FolderKanban className="h-6 w-6" /> Projects
                    </h3>
                    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {(projectCards.length
                        ? projectCards
                        : [
                            {
                              title: "Project Showcase",
                              description:
                                "Generate resume insights to auto-populate featured portfolio projects.",
                            },
                          ]
                      ).map((project, index) => (
                        <div
                          key={`${project.title}-${index}`}
                          className="rounded-xl border border-slate-700 bg-slate-900/70 p-5 hover:border-cyan-300/70 transition-colors"
                        >
                          <p className="text-xs uppercase tracking-[0.22em] text-cyan-300 mb-2">
                            Case Study {index + 1}
                          </p>
                          <h4 className="text-lg font-semibold text-white mb-2">
                            {project.title}
                          </h4>
                          <p className="text-slate-300 text-sm leading-6">
                            {project.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-6">
                    <h3 className="text-2xl font-semibold mb-4 flex items-center gap-2 text-cyan-200">
                      <Code2 className="h-6 w-6" /> Skills
                    </h3>
                    <div className="flex flex-wrap gap-3">
                      {(portfolioSkills.length
                        ? portfolioSkills
                        : ["React", "TypeScript", "Node.js"]
                      ).map((skill, i) => (
                        <span
                          key={`${skill}-${i}`}
                          className="inline-flex items-center gap-2 rounded-full border border-cyan-300/40 bg-cyan-400/10 px-3 py-1.5 text-sm text-cyan-100"
                        >
                          <BadgeCheck className="h-4 w-4 text-cyan-300" />{" "}
                          {skill}
                        </span>
                      ))}
                    </div>
                  </section>

                  <section className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-6">
                    <h3 className="text-2xl font-semibold mb-4 flex items-center gap-2 text-cyan-200">
                      <Mail className="h-6 w-6" /> Contact
                    </h3>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-3 text-sm text-slate-300">
                        <p className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-cyan-300" />{" "}
                          {defaultEmail}
                        </p>
                        <p className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-cyan-300" /> +1 (555)
                          010-2026
                        </p>
                        <p className="text-slate-400 leading-6">
                          Send a message to discuss projects, collaboration, or
                          full-time opportunities.
                        </p>
                      </div>

                      <form className="space-y-3">
                        <Input
                          placeholder="Your name"
                          className="bg-slate-950/80 border-slate-700 text-slate-100"
                        />
                        <Input
                          type="email"
                          placeholder="Your email"
                          className="bg-slate-950/80 border-slate-700 text-slate-100"
                        />
                        <Textarea
                          rows={4}
                          placeholder={`Hi ${displayName}, I'd like to connect about ${displayRole} opportunities.`}
                          className="bg-slate-950/80 border-slate-700 text-slate-100"
                        />
                        <Button type="button" className="w-full md:w-auto">
                          <Send className="mr-2 h-4 w-4" /> Send Message
                        </Button>
                      </form>
                    </div>
                  </section>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
