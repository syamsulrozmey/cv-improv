# App Flow Document for CV-Improv

## Onboarding and Sign-In/Sign-Up

When a brand-new user first arrives at the CV-Improv landing page, they will see a clean call-to-action button labeled "Get Started." Clicking this button takes the user to the sign-up page, where they can create an account by entering an email address and choosing a secure password. After submitting the form, the user is redirected to their personal dashboard. If the user already has an account, a link at the bottom of the sign-up form allows them to navigate to the sign-in page. The sign-in page requests the registered email and password and authenticates the user before sending them back to the dashboard. In case the user forgets their password, they can click the "Forgot Password" link on the sign-in page, submit their email address, and receive a reset link. Following that link lets them choose a new password, after which they can return to the sign-in page and log in normally. To sign out of the application, the user can click the profile avatar in the top-right corner of any page and select "Sign Out," which ends the session and returns them to the landing page.

## Main Dashboard or Home Page

Upon logging in, the user lands on the dashboard, which features a top navigation bar containing the CV-Improv logo on the left and the user avatar on the right. Under the logo, a primary button labeled "Create New CV" invites the user to start a new project. Below that, the dashboard lists all previously saved CVs in card format, each showing the project name, last modified date, and quick-access buttons for "Edit," "Export," and "Share." A secondary button labeled "Import Existing CV" sits alongside the "Create New CV" button and leads to an upload interface for DOCX or PDF files. The user can navigate to account settings at any time by clicking their avatar, or they can return to this dashboard view by selecting the logo in the navigation bar.

## Detailed Feature Flows and Page Transitions

### Template Selection and New CV Creation

When the user clicks "Create New CV," they are taken to the Template Library page. Here they see a grid of professionally designed templates. Each template displays a thumbnail preview and a name indicating its style and recommended use case. As the user hovers over or clicks a template, a full-screen preview appears. Once the user selects their preferred template, they click "Use This Template" and are immediately taken into the WYSIWYG editor with the chosen design loaded and ready for customization.

### WYSIWYG Editor and Live Preview

Inside the editor, the left side shows the editable CV layout, and the right side displays a live preview of the final output. The user can click on any text field—such as header, experience entries, or education sections—and type directly. To move sections around, the user simply drags the section headers up or down. Inline formatting controls appear when text is selected, allowing easy application of bold, italics, or list formatting. As changes are made, the live preview updates instantly to reflect the new layout and styling.

### AI-Powered Content Enhancement

Alongside the editor, an AI Suggestions panel lists recommendations for improving phrasing, grammar, and impact. As the user types in a field, the panel refreshes its suggestions based on the current content. The user can click on any suggestion to apply it directly to the text, or they can dismiss individual suggestions. If the AI service is temporarily unavailable, the panel shows a gentle message and allows the user to continue editing without suggestions until the service returns.

### Importing an Existing CV

By clicking "Import Existing CV" on the dashboard, the user opens an upload page where they drag and drop or browse for a DOCX or PDF file. After the file is received, the system parses the text into the structured CV editor fields. The user then sees a confirmation screen showing each section and its parsed content. They can correct or delete any fields before clicking "Confirm Import," which creates a new CV project and opens it directly in the editor for further customization.

### Exporting and Downloading the Final CV

When the user finishes editing, they click the "Export" button in the top-right corner of the editor. A modal dialog appears, offering the choice of PDF or DOCX format. Upon selection, the application generates the file on the server, and the browser automatically starts the download. A small confirmation message appears briefly, and the user remains in the editor in case they want to make further edits or export again.

### Collaboration and Sharing

From either the dashboard or within the editor, the user can click the "Share" icon next to a CV. A modal dialog lets them enter an email address or copy a secure, view-only link. Once the user confirms, an email is sent to the recipient, or the link is copied to the clipboard. Anyone with this link can view the CV in a read-only mode without needing to sign in. The user can revoke access at any time by returning to the share dialog and disabling the link.

## Settings and Account Management

Clicking the user avatar in the top-right corner reveals a dropdown menu with a "Settings" option. On the Account Settings page, the user can update their full name, change their email address, or modify their password by entering the current password and choosing a new one. Below these fields is a toggle for email notification preferences, allowing the user to opt in or out of updates on collaboration invites or product announcements. A "Save Changes" button commits updates and displays a brief success message before returning the user to the settings page. A "Back to Dashboard" link in the navigation bar always brings the user back to their list of CVs.

## Error States and Alternate Paths

If the user enters an incorrect email or password on sign-in, an inline error message appears above the form explaining the mismatch. Entering an unsupported file type during import triggers a clear alert stating that only DOCX and text-based PDFs are accepted, along with a prompt to try again. Should the AI Suggestions panel fail to load due to network issues or API limits, the panel displays a warning icon and retry button. When export generation fails, the modal shows an error message and a "Retry" button so the user can attempt the download again. In any part of the app, if connectivity drops, a banner appears at the top of the screen alerting the user and suggesting they check their connection, while still allowing local editing until the network is restored.

## Conclusion and Overall App Journey

From the moment a user lands on the CV-Improv site and signs up, they move seamlessly to creating or importing a CV. The dashboard acts as the central hub for accessing all projects. Choosing a template and editing it happens in a unified WYSIWYG editor with side-by-side live preview and AI-driven text enhancement. Once satisfied, the user can export in different formats or share a read-only link with peers. Throughout the journey, account settings and error handling remain intuitive and easy to navigate. This flow ensures a smooth path from initial sign-up to the final polished resume ready for download or collaboration.