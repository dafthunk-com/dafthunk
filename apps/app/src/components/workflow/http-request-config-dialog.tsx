import { html } from "@codemirror/lang-html";
import { json } from "@codemirror/lang-json";
import { xml } from "@codemirror/lang-xml";
import {
  defaultHighlightStyle,
  syntaxHighlighting,
} from "@codemirror/language";
import { EditorState } from "@codemirror/state";
import { EditorView, lineNumbers } from "@codemirror/view";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, File, Plus, Trash2, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Controller, SubmitHandler, useForm } from "react-hook-form";
import * as z from "zod";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/utils/utils";

// HTTP method constants
const HTTP_METHODS = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
];

// Body type options
type BodyType = "none" | "form-data" | "urlencoded" | "raw" | "binary";
type RawBodyContentType = "json" | "text" | "xml" | "html";

// Config submitted to execution
export interface HttpRequestConfig {
  method: string;
  headers: Record<string, string>;
  queryParams: Record<string, string>;
  body: {
    type: BodyType;
    rawType?: RawBodyContentType;
    content?: string | FormData | File;
  };
}

interface HttpRequestConfigDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (config: HttpRequestConfig) => void;
}

// Validation schema
const keyValueSchema = z.object({
  key: z.string(),
  value: z.string(),
});

const validationSchema = z.object({
  method: z.string().min(1, "Method is required"),
  headers: z.array(keyValueSchema),
  queryParams: z.array(keyValueSchema),
  bodyType: z.enum(["none", "form-data", "urlencoded", "raw", "binary"]),
  rawBodyContent: z.string().optional(),
  rawBodyContentType: z.enum(["json", "text", "xml", "html"]),
  formDataEntries: z.array(
    z.object({
      key: z.string(),
      value: z.any().optional(),
    })
  ),
});

type FormValues = z.infer<typeof validationSchema>;

// File upload field component
function FileUploadField({
  file,
  onChange,
}: {
  index: number;
  fileName: string;
  file?: File;
  onChange: (file: File | null) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      onChange(f);
    }
  };

  const handleRemoveFile = () => {
    onChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-1">
      {file ? (
        <div className="flex items-center justify-between p-2 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex items-center gap-2 min-w-0">
            <File className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <span className="text-sm text-blue-900 truncate">{file.name}</span>
            <span className="text-xs text-blue-600 flex-shrink-0">
              ({(file.size / 1024).toFixed(2)} KB)
            </span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRemoveFile}
            className="h-6 px-2"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      ) : (
        <label className="flex items-center justify-center w-full p-2 border-2 border-dashed border-neutral-300 rounded-md cursor-pointer hover:border-blue-400 transition">
          <div className="flex items-center gap-2">
            <Upload className="w-4 h-4 text-neutral-400" />
            <span className="text-sm text-neutral-600">Upload file</span>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileChange}
            accept="*/*"
          />
        </label>
      )}
    </div>
  );
}

// CodeMirror editor component for raw body
interface CodeMirrorEditorProps {
  value: string;
  onChange: (value: string) => void;
  contentType: RawBodyContentType;
}

function CodeMirrorEditor({
  value,
  onChange,
  contentType,
}: CodeMirrorEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);

  // Keep onChange ref up to date
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Get the appropriate language extension based on content type
  const getLanguageExtension = () => {
    switch (contentType) {
      case "json":
        return json();
      case "xml":
        return xml();
      case "html":
        return html();
      case "text":
      default:
        return [];
    }
  };

  // Create editor once on mount
  useEffect(() => {
    if (!editorRef.current) return;

    const view = new EditorView({
      state: EditorState.create({
        doc: value,
        extensions: [
          getLanguageExtension(),
          syntaxHighlighting(defaultHighlightStyle),
          lineNumbers(),
          EditorView.lineWrapping,
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              const newValue = update.state.doc.toString();
              onChangeRef.current(newValue);
            }
          }),
          EditorView.baseTheme({
            "&.cm-focused": {
              outline: "none !important",
            },
          }),
          EditorView.theme({
            "&": {
              height: "100%",
              fontSize: "14px",
            },
            ".cm-scroller": {
              overflow: "auto",
            },
            ".cm-gutters": {
              fontSize: "14px",
            },
          }),
        ],
      }),
      parent: editorRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [contentType]);

  // Update editor content when value prop changes externally
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const currentValue = view.state.doc.toString();
    if (currentValue !== value) {
      view.dispatch({
        changes: { from: 0, to: currentValue.length, insert: value },
      });
    }
  }, [value]);

  return (
    <div className={cn("border rounded-md overflow-hidden")}>
      <div className="h-[300px] relative">
        <div ref={editorRef} className="h-full" />
      </div>
    </div>
  );
}

export function HttpRequestConfigDialog({
  isOpen,
  onClose,
  onSubmit,
}: HttpRequestConfigDialogProps) {
  const [files, setFiles] = useState<Record<string, File>>({});

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { isValid },
  } = useForm<FormValues>({
    resolver: zodResolver(validationSchema),
    mode: "onChange",
    defaultValues: {
      method: "POST",
      headers: [{ key: "", value: "" }],
      queryParams: [{ key: "", value: "" }],
      bodyType: "none",
      rawBodyContent: "",
      rawBodyContentType: "json",
      formDataEntries: [{ key: "", value: "" }],
    },
  });

  const method = watch("method");
  const headers = watch("headers");
  const queryParams = watch("queryParams");
  const formDataEntries = watch("formDataEntries");
  const rawBodyContentType = watch("rawBodyContentType");

  // Check if method allows body
  const methodAllowsBody = !["GET", "HEAD", "OPTIONS"].includes(method);

  const addHeaderRow = () => {
    const newHeaders = [...headers, { key: "", value: "" }];
    setValue("headers", newHeaders, { shouldValidate: true });
  };

  const removeHeaderRow = (index: number) => {
    const newHeaders = headers.filter((_, i) => i !== index);
    setValue("headers", newHeaders, { shouldValidate: true });
  };

  const addQueryParamRow = () => {
    const newParams = [...queryParams, { key: "", value: "" }];
    setValue("queryParams", newParams, { shouldValidate: true });
  };

  const removeQueryParamRow = (index: number) => {
    const newParams = queryParams.filter((_, i) => i !== index);
    setValue("queryParams", newParams, { shouldValidate: true });
  };

  const addFormDataRow = () => {
    const newEntries = [...formDataEntries, { key: "", value: "" }];
    setValue("formDataEntries", newEntries, { shouldValidate: true });
  };

  const removeFormDataRow = (index: number) => {
    const newEntries = formDataEntries.filter((_, i) => i !== index);
    setValue("formDataEntries", newEntries, { shouldValidate: true });
    // Also remove file if exists
    const fileKey = formDataEntries[index].key;
    if (fileKey && files[fileKey]) {
      const newFiles = { ...files };
      delete newFiles[fileKey];
      setFiles(newFiles);
    }
  };

  const handleFileChange = (index: number, file: File | null) => {
    const fileKey = formDataEntries[index].key;
    if (!fileKey) return;

    const newFiles = { ...files };
    if (file) {
      newFiles[fileKey] = file;
    } else {
      delete newFiles[fileKey];
    }
    setFiles(newFiles);
  };

  const processSubmit: SubmitHandler<FormValues> = (data) => {
    // Build headers object
    const headersObj: Record<string, string> = {};
    data.headers
      .filter((h) => h.key && h.value)
      .forEach(({ key, value }) => {
        headersObj[key] = value;
      });

    // Build query params object
    const queryParamsObj: Record<string, string> = {};
    data.queryParams
      .filter((q) => q.key && q.value)
      .forEach(({ key, value }) => {
        queryParamsObj[key] = value;
      });

    // Build body
    let bodyContent: string | FormData | File | undefined;
    const bodyTypeForConfig: BodyType = data.bodyType;

    if (data.bodyType === "none") {
      bodyContent = undefined;
    } else if (
      data.bodyType === "form-data" ||
      data.bodyType === "urlencoded"
    ) {
      const formData = new FormData();
      data.formDataEntries.forEach(({ key, value }) => {
        if (key) {
          // Check if this entry has a file
          if (files[key]) {
            formData.append(key, files[key]);
          } else if (value) {
            formData.append(key, String(value));
          }
        }
      });
      bodyContent = formData;
    } else if (data.bodyType === "raw") {
      bodyContent = data.rawBodyContent;
    } else if (data.bodyType === "binary") {
      // For binary, we need to find the file from formDataEntries
      const binaryEntry = data.formDataEntries.find((e) => e.key === "file");
      if (binaryEntry && files[binaryEntry.key]) {
        bodyContent = files[binaryEntry.key];
      }
    }

    const config: HttpRequestConfig = {
      method: data.method,
      headers: headersObj,
      queryParams: queryParamsObj,
      body: {
        type: bodyTypeForConfig,
        rawType: data.bodyType === "raw" ? data.rawBodyContentType : undefined,
        content: bodyContent,
      },
    };

    onSubmit(config);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle>Configure HTTP Request</AlertDialogTitle>
          <AlertDialogDescription>
            Set up headers, query parameters, and body for your HTTP request.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <form onSubmit={handleSubmit(processSubmit)} id="httpRequestConfigForm">
          <div className="space-y-4 py-4">
            {/* HTTP Method Selection */}
            <div className="space-y-2">
              <Label htmlFor="method">HTTP Method</Label>
              <Controller
                name="method"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="method">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {HTTP_METHODS.map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {/* Tabs for Headers, Query Params, Body */}
            <Tabs defaultValue="headers" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="headers">Headers</TabsTrigger>
                <TabsTrigger value="query">Query Params</TabsTrigger>
                <TabsTrigger value="body" disabled={!methodAllowsBody}>
                  Body
                </TabsTrigger>
              </TabsList>

              {/* Headers Tab */}
              <TabsContent value="headers" className="space-y-3">
                <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                  {headers.map((_, index) => (
                    <div
                      key={`header-${index}`}
                      className="flex gap-2 items-end"
                    >
                      <Controller
                        name={`headers.${index}.key`}
                        control={control}
                        render={({ field }) => (
                          <Input
                            {...field}
                            placeholder="Header name"
                            className="flex-1"
                          />
                        )}
                      />
                      <Controller
                        name={`headers.${index}.value`}
                        control={control}
                        render={({ field }) => (
                          <Input
                            {...field}
                            placeholder="Header value"
                            className="flex-1"
                          />
                        )}
                      />
                      {headers.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeHeaderRow(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addHeaderRow}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Header
                </Button>
              </TabsContent>

              {/* Query Params Tab */}
              <TabsContent value="query" className="space-y-3">
                <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                  {queryParams.map((_, index) => (
                    <div
                      key={`query-${index}`}
                      className="flex gap-2 items-end"
                    >
                      <Controller
                        name={`queryParams.${index}.key`}
                        control={control}
                        render={({ field }) => (
                          <Input
                            {...field}
                            placeholder="Parameter name"
                            className="flex-1"
                          />
                        )}
                      />
                      <Controller
                        name={`queryParams.${index}.value`}
                        control={control}
                        render={({ field }) => (
                          <Input
                            {...field}
                            placeholder="Parameter value"
                            className="flex-1"
                          />
                        )}
                      />
                      {queryParams.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeQueryParamRow(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addQueryParamRow}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Query Parameter
                </Button>
              </TabsContent>

              {/* Body Tab */}
              {methodAllowsBody && (
                <TabsContent value="body" className="space-y-3">
                  {/* Body Type Selector with Tabs */}
                  <Controller
                    name="bodyType"
                    control={control}
                    render={({ field }) => (
                      <Tabs
                        value={field.value}
                        onValueChange={field.onChange}
                        className="w-full"
                      >
                        <TabsList className="grid w-full grid-cols-5">
                          <TabsTrigger value="none">None</TabsTrigger>
                          <TabsTrigger value="form-data">Form Data</TabsTrigger>
                          <TabsTrigger value="urlencoded">
                            URL Encoded
                          </TabsTrigger>
                          <TabsTrigger value="raw">Raw</TabsTrigger>
                          <TabsTrigger value="binary">Binary</TabsTrigger>
                        </TabsList>

                        {/* None */}
                        <TabsContent value="none" className="mt-3">
                          <p className="text-sm text-muted-foreground">
                            No request body will be sent.
                          </p>
                        </TabsContent>

                        {/* Form Data Body */}
                        <TabsContent
                          value="form-data"
                          className="mt-3 space-y-2"
                        >
                          <Label>Form Fields</Label>
                          <div className="space-y-2 max-h-[30vh] overflow-y-auto">
                            {formDataEntries.map((_, index) => (
                              <div
                                key={`form-data-${index}`}
                                className="space-y-1.5 p-2 border rounded-md"
                              >
                                <Controller
                                  name={`formDataEntries.${index}.key`}
                                  control={control}
                                  render={({ field: keyField }) => (
                                    <Input
                                      {...keyField}
                                      placeholder="Field name"
                                      className="text-sm"
                                    />
                                  )}
                                />
                                <FileUploadField
                                  index={index}
                                  fileName={formDataEntries[index].key}
                                  file={files[formDataEntries[index].key]}
                                  onChange={(file) =>
                                    handleFileChange(index, file)
                                  }
                                />
                                {formDataEntries.length > 1 && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeFormDataRow(index)}
                                    className="w-full"
                                  >
                                    <Trash2 className="w-4 h-4 mr-1" />
                                    Remove
                                  </Button>
                                )}
                              </div>
                            ))}
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={addFormDataRow}
                            className="w-full"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Field
                          </Button>
                        </TabsContent>

                        {/* URL Encoded Body */}
                        <TabsContent
                          value="urlencoded"
                          className="mt-3 space-y-2"
                        >
                          <Label>Form Fields</Label>
                          <div className="space-y-2 max-h-[30vh] overflow-y-auto">
                            {formDataEntries.map((_, index) => (
                              <div
                                key={`urlencoded-${index}`}
                                className="space-y-1.5 p-2 border rounded-md"
                              >
                                <Controller
                                  name={`formDataEntries.${index}.key`}
                                  control={control}
                                  render={({ field: keyField }) => (
                                    <Input
                                      {...keyField}
                                      placeholder="Field name"
                                      className="text-sm"
                                    />
                                  )}
                                />
                                <Controller
                                  name={`formDataEntries.${index}.value`}
                                  control={control}
                                  render={({ field: valueField }) => (
                                    <Input
                                      {...valueField}
                                      placeholder="Field value"
                                      className="text-sm"
                                    />
                                  )}
                                />
                                {formDataEntries.length > 1 && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeFormDataRow(index)}
                                    className="w-full"
                                  >
                                    <Trash2 className="w-4 h-4 mr-1" />
                                    Remove
                                  </Button>
                                )}
                              </div>
                            ))}
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={addFormDataRow}
                            className="w-full"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Field
                          </Button>
                        </TabsContent>

                        {/* Raw Body */}
                        <TabsContent value="raw" className="mt-3 space-y-3">
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <Label htmlFor="rawBodyContentType">
                                Content Type
                              </Label>
                              <Controller
                                name="rawBodyContentType"
                                control={control}
                                render={({ field }) => (
                                  <Select
                                    value={field.value}
                                    onValueChange={field.onChange}
                                  >
                                    <SelectTrigger id="rawBodyContentType">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="json">JSON</SelectItem>
                                      <SelectItem value="text">Text</SelectItem>
                                      <SelectItem value="xml">XML</SelectItem>
                                      <SelectItem value="html">HTML</SelectItem>
                                    </SelectContent>
                                  </Select>
                                )}
                              />
                            </div>
                          </div>
                          <Label>Body Content</Label>
                          <Controller
                            name="rawBodyContent"
                            control={control}
                            render={({ field }) => (
                              <CodeMirrorEditor
                                value={field.value || ""}
                                onChange={field.onChange}
                                contentType={rawBodyContentType}
                              />
                            )}
                          />
                        </TabsContent>

                        {/* Binary Body */}
                        <TabsContent value="binary" className="mt-3 space-y-2">
                          <Label>Binary File</Label>
                          <FileUploadField
                            index={0}
                            fileName="file"
                            file={files["file"]}
                            onChange={(file) => handleFileChange(0, file)}
                          />
                        </TabsContent>
                      </Tabs>
                    )}
                  />
                </TabsContent>
              )}
            </Tabs>

            {/* Info Box */}
            {!methodAllowsBody && (
              <div className="flex gap-2 p-3 bg-muted rounded-md text-sm text-muted-foreground">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <p>
                  The {method} method typically doesn't support a request body.
                </p>
              </div>
            )}
          </div>
        </form>

        <AlertDialogFooter className="pt-4">
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
          <Button
            type="submit"
            form="httpRequestConfigForm"
            disabled={!isValid}
          >
            Execute Request
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
