import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Upload, FileText, CheckCircle, AlertCircle, Search, RefreshCw, File } from 'lucide-react';
import { toast } from 'sonner';
import api from '../lib/api';
import { coerceToDisplayString, getApiErrorMessage } from '../lib/error-mapping';

export default function DocumentsPage() {
    const router = useRouter();
    const [isUploading, setIsUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFiles(Array.from(e.dataTransfer.files));
        }
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        if (e.target.files && e.target.files.length > 0) {
            handleFiles(Array.from(e.target.files));
            e.target.value = "";
        }
    };

    const [documents, setDocuments] = useState<any[]>([]);
    const [loadingDocs, setLoadingDocs] = useState(true);

    useEffect(() => {
        fetchDocuments();
    }, []);

    const fetchDocuments = async () => {
        try {
            const response = await api.get('/api/documents', { retry: false } as any);
            if (response.data?.success) {
                setDocuments(response.data.data ?? []);
            } else {
                setDocuments([]);
            }
        } catch (error: any) {
            console.error("Failed to fetch documents", error);
            if (error?.response?.status === 401) {
                setDocuments([]);
                toast.error("Sessioon aegus. Laadi leht uuesti, et arendusrežiimis jätkata.");
            } else {
                toast.error("Dokumentide laadimine ebaõnnestus");
            }
        } finally {
            setLoadingDocs(false);
        }
    };

    async function handleFiles(files: File[]) {
        const allowedFiles = files.filter((file) =>
            /\.(pdf|docx|txt|md)$/i.test(file.name),
        );

        if (allowedFiles.length === 0) {
            const message = "Vali vähemalt üks PDF, DOCX, TXT või MD fail.";
            setUploadStatus({ type: "error", message });
            toast.error(message);
            return;
        }

        setIsUploading(true);
        setUploadStatus(null);

        // Create FormData
        const formData = new FormData();
        allowedFiles.forEach((file) => formData.append('file', file));

        try {
            const response = await api.post('/api/documents/upload', formData, {
                retry: false,
                headers: { 'Content-Type': undefined },
            } as any);

            const uploadedDocuments = response.data?.documents ?? (response.data?.data ? [response.data.data] : []);
            if (uploadedDocuments.length) {
                setDocuments((prev) => [...uploadedDocuments, ...prev]);
            }

            setUploadStatus({
                type: 'success',
                message: allowedFiles.length === 1
                    ? `"${allowedFiles[0].name}" laaditi üles ja on nüüd PDF töötluseks valmis.`
                    : `${allowedFiles.length} faili laaditi üles ja on nüüd PDF töötluseks valmis.`
            });
            toast.success("Dokument laaditi üles");
            fetchDocuments(); // Refresh list

        } catch (error: any) {
            console.error("Upload failed", error);
            const message = coerceToDisplayString(
                getApiErrorMessage(error, "Dokumendi üleslaadimine ebaõnnestus."),
                "Dokumendi üleslaadimine ebaõnnestus.",
            );
            setUploadStatus({
                type: 'error',
                message,
            });
            toast.error(message);
        } finally {
            setIsUploading(false);
        }
    }

    return (
        <>
            <Head>
                <title>Dokumendid | Annaator</title>
            </Head>

            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Dokumendid</h1>
                    <p className="text-muted-foreground mt-2">
                        Laadi dokumendid teadmistebaasi, et Annaatori agendid saaksid neid otsida ja kasutada.
                    </p>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                    {/* Upload Area */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Laadi dokument üles</CardTitle>
                            <CardDescription>
                                Toetatud vormingud: PDF, DOCX, TXT, MD
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div
                                className={`
                  border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors
                  ${dragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}
                  ${isUploading ? 'opacity-50 pointer-events-none' : ''}
                `}
                                onDragEnter={handleDrag}
                                onDragLeave={handleDrag}
                                onDragOver={handleDrag}
                                onDrop={handleDrop}
                                onClick={() => document.getElementById('file-upload')?.click()}
                            >
                                <input
                                    id="file-upload"
                                    type="file"
                                    multiple
                                    className="hidden"
                                    onChange={handleChange}
                                    accept=".pdf,.docx,.txt,.md"
                                />

                                <div className="flex flex-col items-center justify-center gap-4">
                                    <div className="p-4 bg-muted rounded-full">
                                        {isUploading ? (
                                            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                                        ) : (
                                            <Upload className="h-8 w-8 text-primary" />
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-lg">
                                            {isUploading ? "Laadin üles..." : "Kliki üleslaadimiseks või lohista PDF-id siia"}
                                        </h3>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            PDF, DOCX, TXT või MD. Võid valida mitu faili korraga.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {uploadStatus && (
                                <div className={`mt-6 p-4 rounded-md flex items-start gap-3 ${uploadStatus.type === 'success' ? 'bg-green-500/10 text-green-600' : 'bg-destructive/10 text-destructive'
                                    }`}>
                                    {uploadStatus.type === 'success' ? (
                                        <CheckCircle className="h-5 w-5 shrink-0" />
                                    ) : (
                                        <AlertCircle className="h-5 w-5 shrink-0" />
                                    )}
                                    <p className="text-sm font-medium">
                                        {coerceToDisplayString(uploadStatus.message)}
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Quick Actions / Status */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Otsi ja kontrolli</CardTitle>
                            <CardDescription>
                                Testi üleslaaditud dokumente kohe.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="bg-muted/50 p-4 rounded-lg">
                                <h4 className="font-medium flex items-center gap-2 mb-2">
                                    <FileText className="h-4 w-4" />
                                    Kuidas see töötab
                                </h4>
                                <ul className="text-sm text-muted-foreground space-y-2 list-disc pl-5">
                                    <li>Dokumendid parsitakse ja jagatakse tükkideks.</li>
                                    <li>Tükid vektoriseeritakse AI mudelite abil.</li>
                                    <li>Need salvestatakse LanceDB-sse semantiliseks otsinguks.</li>
                                    <li>Agendid saavad seda teadmist kohe kasutada.</li>
                                </ul>
                            </div>

                            <Button
                                className="w-full"
                                variant="outline"
                                onClick={() => router.push('/search')}
                            >
                                <Search className="mr-2 h-4 w-4" />
                                Ava otsing
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                {/* Documents List */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold tracking-tight">Sinu dokumendid</h2>
                        <Button variant="ghost" size="sm" onClick={fetchDocuments} disabled={loadingDocs}>
                            <RefreshCw className={`h-4 w-4 mr-2 ${loadingDocs ? 'animate-spin' : ''}`} />
                            Värskenda
                        </Button>
                    </div>

                    {documents.length === 0 && !loadingDocs ? (
                        <Card>
                            <CardContent className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
                                <FileText className="h-12 w-12 mb-4 opacity-20" />
                                <p>Ühtegi dokumenti pole veel üles laaditud.</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {documents.map((doc) => (
                                <Card
                                    key={doc.id}
                                    className="cursor-pointer hover:border-primary transition-colors group"
                                    onClick={() => router.push(`/documents/${doc.id}`)}
                                >
                                    <CardHeader className="flex flex-row items-top justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium leading-none truncate pr-4">
                                            {coerceToDisplayString(doc.title, 'Pealkirjata')}
                                        </CardTitle>
                                        <File className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-xs text-muted-foreground line-clamp-3 mb-4">
                                            {coerceToDisplayString(doc.text_preview, '')}
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            {new Date(doc.created_at).toLocaleDateString()}
                                        </p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
