import re

with open('src/pages/BusinessPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add logo_path to the initial state
content = content.replace("upi_vpa: '',", "upi_vpa: '',\n      logo_path: '',")
content = content.replace("upi_vpa: business.data.upi_vpa ?? '',", "upi_vpa: business.data.upi_vpa ?? '',\n        logo_path: business.data.logo_path ?? '',")

# Add logo_path to the payload
content = content.replace("upi_vpa: form.upi_vpa.trim() || null,", "upi_vpa: form.upi_vpa.trim() || null,\n              logo_path: form.logo_path || null,")

# Add the UI for logo upload
upload_ui = '''
            <div className="mb-6 border-b border-border pb-6">
              <label className="mb-2 block text-sm font-semibold">Business Logo</label>
              <div className="flex items-center gap-5">
                {form.logo_path ? (
                  <div className="relative h-20 w-20 overflow-hidden rounded-xl border border-border bg-card">
                    <img src={form.logo_path} alt="Logo" className="h-full w-full object-contain" />
                    <button
                      type="button"
                      onClick={() => setForm((c) => ({ ...c, logo_path: '' }))}
                      className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-sm hover:brightness-110"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-xl border border-dashed border-border bg-muted/30">
                    <FileImage size={24} className="text-muted-foreground/50" />
                  </div>
                )}
                <div>
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/webp"
                    className="hidden"
                    id="logo-upload"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        setForm((c) => ({ ...c, logo_path: event.target?.result as string }));
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                  <label
                    htmlFor="logo-upload"
                    className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-bold text-foreground transition hover:bg-muted"
                  >
                    <UploadCloud size={16} /> Upload image
                  </label>
                  <p className="mt-2 text-xs text-muted-foreground">Used on PDF invoices. PNG/JPG up to 1MB.</p>
                </div>
              </div>
            </div>
'''

content = content.replace(
    'Business name <span className="text-destructive">*</span>',
    upload_ui + '\n                  Business name <span className="text-destructive">*</span>'
)

with open('src/pages/BusinessPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
