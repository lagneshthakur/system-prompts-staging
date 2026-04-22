# 🎨 System Prompts Dashboard

A user-friendly web application for **designers and non-technical users** to manage and edit AI system prompts for the BrainMo App. This tool allows you to safely modify the prompts that control how our AI services process timetables and curriculum data.

## 📋 What This Tool Does

This dashboard lets you:
- ✅ **View and edit system prompts** that control AI behavior
- ✅ **Preserve exact text formatting** (spaces, line breaks, special characters)
- ✅ **Save changes safely** to the backend database
- ✅ **Navigate easily** between different prompt groups
- ✅ **See real-time character counts** and last saved timestamps

### 🤖 Core Prompt Workflows You Can Edit:

1. **📊 Timetable Extraction** (ID: 1016) - Controls how AI extracts timetable data from timetable uploads
2. **🛡️ Timetable Validation** (ID: 1002) - Controls how AI validates extracted timetable data
3. **🔍 Timetable Lookup** (ID: 1003) - Controls how AI searches and retrieves timetable information
4. **📄 Curriculum Extraction** (ID: 1004) - Controls how AI processes curriculum documents

---

## 🚀 Quick Start Guide for Designers

### **Step 1: Get the Code**

1. **Open your terminal/command prompt**
2. **Navigate to your projects folder:**
   ```bash
   cd /projects/teachers-app-system-prompts
   ```
3. **Clone the project** (if not already done):
   ```bash
   git clone [repository-url] teachers-app-system-prompts
   cd teachers-app-system-prompts
   ```

### **Step 2: Install Dependencies**

**Make sure you have Node.js installed** (version 18 or higher). If not, download from [nodejs.org](https://nodejs.org/).

```bash
npm install
```

*This will download all the required packages (may take 2-3 minutes).*

### **Step 3: Start the Application**

```bash
npm run dev
```

**You should see:**
```
✓ Ready in 1369ms
- Local:        http://localhost:3000
- Network:      http://10.5.0.2:3000
```

### **Step 4: Open in Browser**

Open your web browser and go to: **http://localhost:3000**

🎉 **You're ready to edit prompts!**

---

## 🎯 How to Use the Dashboard

### **Navigation**
- **Left Sidebar**: Click on any prompt type to edit it
- **Dashboard Home**: Overview of all prompts with quick access buttons
- **Back Button**: Return to dashboard from any prompt editor

### **Editing Prompts**
1. **Click on a prompt** from the sidebar or dashboard
2. **Edit the text** in the large text area
3. **Preserve formatting** - the tool maintains exact spacing and line breaks
4. **Click "Save"** when finished
5. **Check the timestamp** to confirm your changes were saved

#### **✅ Safe Changes**
- **Update descriptions** and explanations
- **Modify examples** within existing structure
- **Adjust thresholds** or numeric values when specified
- **Update instruction text** while keeping formatting


---

## 🛠️ Troubleshooting

### **Common Issues**

#### **"npm: command not found"**
- **Solution**: Install Node.js from [nodejs.org](https://nodejs.org/)
- **Restart** your terminal after installation

#### **"Port 3000 already in use"**
- **Solution**: Either close other applications using port 3000, or use:
  ```bash
  npm run dev -- --port 3001
  ```
  Then open **http://localhost:3001**

#### **"Cannot connect to backend"**
- **Check**: The application connects to our deployed backend automatically
- **If issues persist**: Contact the development team

#### **Changes not saving**
- **Check**: Your internet connection
- **Try**: Refreshing the page and trying again
- **Verify**: The timestamp updates after clicking "Save"

### **Getting Help**

If you encounter any issues:

1. **Check the browser console** (F12 → Console tab) for error messages
2. **Take a screenshot** of any error messages
3. **Note what you were trying to do** when the issue occurred
4. **Contact the development team** with these details

---

## 🔧 Technical Details

### **Built With**
- **Next.js 15** - Modern React framework
- **TypeScript** - Type-safe JavaScript
- **shadcn/ui** - Beautiful, accessible UI components
- **Tailwind CSS** - Utility-first styling
- **Tabler Icons** - Consistent iconography

### **Project Structure**
```
src/
├── app/                 # Pages and routing
│   ├── page.tsx        # Dashboard home
│   └── prompts/[id]/   # Individual prompt editors
├── components/         # Reusable UI components
│   ├── ui/            # Base UI components
│   └── app-sidebar.tsx # Navigation sidebar
└── lib/               # API client and utilities
    └── api.ts         # Backend communication
```

---

## 📝 For Developers

### **Development Commands**
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Check code quality
```

### **API Endpoints Used**
- `GET /api/v1/admin/prompts` - Fetch all prompts
- `GET /api/v1/admin/prompts/:id` - Fetch specific prompt
- `PUT /api/v1/admin/prompts/:id` - Update specific prompt

### **Key Features**
- ✅ Real-time text formatting preservation
- ✅ Automatic API error handling and retry logic
- ✅ Responsive design for all screen sizes
- ✅ TypeScript for type safety
- ✅ Clean, accessible UI with proper ARIA labels

---

**Happy prompt editing! 🎨✨**
