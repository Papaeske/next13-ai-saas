"use client";

import React, { useState } from "react";
import * as z from "zod";
import { Brain } from "lucide-react";
import { Loader } from "@/components/loader";
import { useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";

import { BotAvatar } from "@/components/bot-avatar";
import { Heading } from "@/components/heading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { useProModal } from "@/hooks/use-pro-modal";

import { Empty } from "@/components/ui/empty";
import { cn } from "@/lib/utils";

interface APIResponse {
  data: string;
}

// Step 1: Update the formSchema interface to include csvurls field
const formSchema = z.object({
  prompt: z.string(),
  csvurls: z.string(), // Add csvurls field to the schema
});

const KnowledgePage = () => {
  const router = useRouter();
  const proModal = useProModal();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      prompt: "",
      csvurls: "", // Initialize the csvurls field with an empty string
    },
  });

  const [apiResponse, setApiResponse] = useState<APIResponse | null>(null);
  const isLoading = form.formState.isSubmitting;

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const { prompt, csvurls } = form.getValues(); // Get the form values
      const response = await fetch(
        `/api/knowledge?csvurls=${encodeURIComponent(csvurls)}&message=${encodeURIComponent(prompt)}`
      );

      const data = await response.json();
      console.log(data);
      setApiResponse(data);

      form.reset();
    } catch (error: any) {
      if (error?.response?.status === 403) {
        proModal.onOpen();
      } else {
        toast.error("Something went wrong.");
      }
    } finally {
      router.refresh();
    }
  };

  return (
    <div>
      <Heading
        title="Knowledge Base"
        description="Our most advanced conversation model."
        icon={Brain}
        iconColor="text-yellow-700"
        bgColor="bg-violet-500/10"
      />
      <div className="px-4 lg:px-8">
        <div>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="
                rounded-lg 
                border 
                w-full 
                p-4 
                px-3 
                md:px-6 
                focus-within:shadow-sm
                grid
                grid-cols-12
                gap-2
              "
            >
              {/* Step 2: Add the new form input for csvurls */}
              <FormField
                name="csvurls"
                render={({ field }) => (
                  <FormItem className="col-span-12 lg:col-span-10">
                    <FormControl className="m-0 p-0">
                      <Input
                        className="border-0 outline-none focus-visible:ring-0 focus-visible:ring-transparent"
                        disabled={isLoading}
                        placeholder="CSV URL"
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              {/* Existing form input for prompt */}
              <FormField
                name="prompt"
                render={({ field }) => (
                  <FormItem className="col-span-12 lg:col-span-10">
                    <FormControl className="m-0 p-0">
                      <Input
                        className="border-0 outline-none focus-visible:ring-0 focus-visible:ring-transparent"
                        disabled={isLoading}
                        placeholder="How do I calculate the radius of a circle?"
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <Button className="col-span-12 lg:col-span-2 w-full" type="submit" disabled={isLoading} size="icon">
                Generate
              </Button>
            </form>
          </Form>
        </div>
        <div className="space-y-4 mt-4">
          {isLoading && (
            <div className="p-8 rounded-lg w-full flex items-center justify-center bg-muted">
              <Loader />
            </div>
          )}
          {apiResponse === null && !isLoading && <Empty label="Ask Away!" />}
          {apiResponse && (
            <div
              key={apiResponse?.data}
              className={cn("p-8 w-full flex items-start gap-x-8 rounded-lg", "bg-muted")}
            >
              <BotAvatar />
              <p className="text-sm">{apiResponse?.data}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default KnowledgePage;