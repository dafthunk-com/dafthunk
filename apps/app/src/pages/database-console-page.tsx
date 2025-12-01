import { DatabaseQueryResponse } from "@dafthunk/types";
import Play from "lucide-react/icons/play";
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router";

import { useAuth } from "@/components/auth-context";
import { InsetError } from "@/components/inset-error";
import { InsetLoading } from "@/components/inset-loading";
import { InsetLayout } from "@/components/layouts/inset-layout";
import { Button } from "@/components/ui/button";
import { CodeEditor } from "@/components/ui/code-editor";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { usePageBreadcrumbs } from "@/hooks/use-page";
import { useDatabase } from "@/services/database-service";
import { makeOrgRequest } from "@/services/utils";

export function DatabaseConsolePage() {
  const { id } = useParams<{ id: string }>();
  const { organization } = useAuth();
  const orgHandle = organization?.handle || "";
  const { setBreadcrumbs } = usePageBreadcrumbs([]);

  const { database, databaseError, isDatabaseLoading } = useDatabase(
    id || null
  );

  const sqlRef = useRef("");

  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<DatabaseQueryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (database) {
      setBreadcrumbs([
        { label: "Databases", to: "/databases" },
        { label: database.name, to: `/databases/${id}` },
        { label: "Console" },
      ]);
    }
  }, [setBreadcrumbs, database, id]);

  const handleChange = (value: string) => {
    sqlRef.current = value;
  };

  const handleExecute = async () => {
    const sqlQuery = sqlRef.current.trim();
    if (!sqlQuery || !orgHandle || !database) return;

    setIsExecuting(true);
    setError(null);
    setResult(null);

    try {
      const response = await makeOrgRequest<DatabaseQueryResponse>(
        orgHandle,
        "/databases",
        `/${database.id}/query`,
        {
          method: "POST",
          body: JSON.stringify({ sql: sqlQuery, params: [] }),
        }
      );

      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsExecuting(false);
    }
  };

  if (isDatabaseLoading) {
    return <InsetLoading title="Database Console" />;
  }

  if (databaseError || !database) {
    return (
      <InsetError
        title="Database Console"
        errorMessage={databaseError?.message || "Database not found"}
      />
    );
  }

  return (
    <InsetLayout title={`${database.name} - Console`}>
      <div className="space-y-6">
        {/* SQL Editor */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="sql">SQL Query</Label>
            <Button onClick={handleExecute} disabled={isExecuting} size="sm">
              {isExecuting ? (
                <Spinner className="h-4 w-4 mr-2" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Execute
            </Button>
          </div>
          <div className="h-[300px] border rounded-md overflow-hidden">
            <CodeEditor value="" onChange={handleChange} language="sql" />
          </div>
        </div>

        {/* Results */}
        {error && (
          <div className="border border-red-200 bg-red-50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-red-900 mb-2">Error</h3>
            <pre className="text-xs text-red-800 whitespace-pre-wrap font-mono">
              {error}
            </pre>
          </div>
        )}

        {result && (
          <div className="border rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Results</h3>
              {result.meta && (
                <div className="text-xs text-muted-foreground space-x-4">
                  {result.meta.rowsAffected !== undefined && (
                    <span>Rows affected: {result.meta.rowsAffected}</span>
                  )}
                  {result.meta.lastInsertRowid !== undefined && (
                    <span>Last insert ID: {result.meta.lastInsertRowid}</span>
                  )}
                </div>
              )}
            </div>

            {result.results && result.results.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      {Object.keys(result.results[0] as object).map((key) => (
                        <th
                          key={key}
                          className="text-left px-3 py-2 font-medium text-xs"
                        >
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.results.map((row, i) => (
                      <tr key={i} className="border-b hover:bg-muted/30">
                        {Object.values(row as object).map((value, j) => (
                          <td key={j} className="px-3 py-2 text-xs font-mono">
                            {value === null
                              ? "NULL"
                              : typeof value === "object"
                                ? JSON.stringify(value)
                                : String(value)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-2 text-xs text-muted-foreground">
                  {result.results.length} row(s) returned
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                Query executed successfully. No rows returned.
              </div>
            )}
          </div>
        )}
      </div>
    </InsetLayout>
  );
}
