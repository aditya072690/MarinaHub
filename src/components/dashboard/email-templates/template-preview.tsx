"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  EMAIL_TEMPLATES,
  SAMPLE_TEMPLATE_DATA,
  renderTemplate,
} from "@/lib/email-templates";

export function TemplatePreview() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="bg-amber-50 text-amber-800">
          Email integration ready
        </Badge>
        <p className="text-sm text-muted-foreground">
          Preview only — no emails are sent from this screen.
        </p>
      </div>

      <Tabs defaultValue="confirmation">
        <TabsList>
          {EMAIL_TEMPLATES.map((t) => (
            <TabsTrigger key={t.id} value={t.id}>
              {t.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {EMAIL_TEMPLATES.map((template) => {
          const rendered = renderTemplate(template, SAMPLE_TEMPLATE_DATA);
          return (
            <TabsContent key={template.id} value={template.id}>
              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Variables</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      {template.variables.map((v) => (
                        <li key={v} className="flex justify-between gap-4">
                          <code className="text-sky-600">{`{{${v}}}`}</code>
                          <span className="text-muted-foreground truncate">
                            {SAMPLE_TEMPLATE_DATA[v]}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Preview</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Subject</p>
                      <p className="font-medium">{rendered.subject}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Body</p>
                      <pre className="whitespace-pre-wrap rounded-lg bg-slate-50 p-4 text-sm">
                        {rendered.body}
                      </pre>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
