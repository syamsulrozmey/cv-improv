flowchart TD
  LandingPage[Landing Page] --> GetStarted[Get Started]
  LandingPage --> SignInLink[Sign In]
  GetStarted --> SignUp[Sign Up]
  SignInLink --> SignIn[Sign In]
  SignUp --> Dashboard[Dashboard]
  SignIn --> Dashboard
  SignIn --> ForgotPassword[Forgots Password]
  ForgotPassword --> ResetLinkSent[Receive Reset Link]
  ResetLinkSent --> ResetPassword[Reset Password]
  ResetPassword --> SignIn

  Dashboard --> CreateCV[Create New CV]
  Dashboard --> ImportCV[Import Existing CV]
  Dashboard --> ProfileMenu[Profile Avatar]
  ProfileMenu --> SignOut[Sign Out]
  ProfileMenu --> Settings[Settings]

  CreateCV --> TemplateLibrary[Template Library]
  TemplateLibrary --> FullPreview[Full Screen Preview]
  FullPreview --> UseTemplate[Use This Template]
  UseTemplate --> Editor[WYSIWYG Editor]

  ImportCV --> UploadPage[Upload DOCX or PDF]
  UploadPage --> Parsing[Parse File]
  Parsing --> ConfirmImport[Confirm Import]
  ConfirmImport --> Editor

  Editor --> LivePreview[Live Preview Panel]
  Editor --> AISuggestions[AI Suggestions Panel]
  Editor --> ExportModal[Export Options]
  ExportModal --> Download[Download File]
  Editor --> Share[Share CV]
  Share --> EmailInvite[Send Email Invite]
  Share --> CopyLink[Copy View Only Link]

  Settings --> UpdateProfile[Update Profile]
  Settings --> ChangePassword[Change Password]
  Settings --> NotificationPref[Notification Preferences]
  Settings --> Dashboard

  SignOut --> LandingPage