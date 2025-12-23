# District BI - Comprehensive User Manual

## Table of Contents

1. [System Overview](#system-overview)
2. [Getting Started](#getting-started)
3. [User Authentication](#user-authentication)
4. [User Roles and Access Control](#user-roles-and-access-control)
5. [Application Management Workflow](#application-management-workflow)
6. [Dashboard Interface](#dashboard-interface)
7. [Document Management](#document-management)
8. [Application Tracking System](#application-tracking-system)
9. [Administrative Functions](#administrative-functions)
10. [Technical Specifications](#technical-specifications)
11. [Troubleshooting](#troubleshooting)
12. [Support](#support)

---

## System Overview

**District BI** is a comprehensive application management system designed for district administration offices. It streamlines the process of handling citizen applications, from submission to final disposition, while maintaining proper audit trails and role-based access controls.

### Key Features

- **Multi-role User Management**: Supports various user roles from frontdesk to district collectors
- **Application Lifecycle Management**: Complete workflow from draft to closure/resolution
- **Document Management**: Secure file upload, verification, and storage with AWS S3 integration
- **Real-time Tracking**: Citizens can track applications using RR numbers or phone numbers
- **Audit Trail**: Comprehensive logging of all actions and status changes
- **Role-based Dashboards**: Customized interfaces based on user roles
- **Notification System**: Automated notifications for status changes and assignments
- **Progressive Web App**: Mobile-friendly interface with offline capabilities

### Technology Stack

- **Frontend**: Next.js 15.3.2 with React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API routes with NextAuth.js for authentication
- **Database**: PostgreSQL with Prisma ORM
- **File Storage**: AWS S3 with presigned URLs
- **Authentication**: NextAuth.js with credentials provider and OTP verification
- **UI Components**: Radix UI with custom theming
- **Real-time Features**: Polling-based updates for dashboards

---

## Getting Started

### System Requirements

- Modern web browser (Chrome, Firefox, Safari, Edge)
- Internet connection for full functionality
- Mobile device support (responsive design)

### First Time Access

1. **Navigate to the System**: Open your web browser and go to the district application portal URL
2. **Create Account**: Contact your system administrator for account creation (registration may be disabled)
3. **Login**: Use your provided credentials to access the system
4. **OTP Verification**: Complete email OTP verification if required
5. **Dashboard Access**: You'll be redirected to your role-specific dashboard

---

## User Authentication

### Login Process

1. **Email/Password Login**:

   - Enter your registered email address
   - Enter your password
   - Click "Sign In"

2. **OTP Verification** (if enabled):
   - Check your email for the verification code
   - Enter the 6-digit OTP
   - Complete verification to access the dashboard

### Security Features

- **Password Requirements**: Minimum 8 characters with complexity requirements
- **Account Lockout**: Multiple failed attempts may temporarily lock your account
- **Session Management**: Automatic logout after inactivity
- **Secure Routes**: Protected pages require authentication

### Password Recovery

1. Click "Forgot Password" on the login page
2. Enter your registered email address
3. Check your email for reset instructions
4. Follow the link to create a new password

---

## User Roles and Access Control

The system implements a hierarchical role-based access control system with different permission levels.

### Administrative Roles

#### Super Admin (`SUPER_ADMIN`)

- **Level**: -2 (Highest privilege)
- **Capabilities**:
  - Full system access and control
  - User management and role assignment
  - System settings configuration
  - All dashboard and application access
- **Dashboard**: Admin panel with comprehensive system overview

#### Admin (`ADMIN`)

- **Level**: -1 (High privilege)
- **Capabilities**:
  - User management (create, edit, activate/deactivate users)
  - Service category management
  - Department and section management
  - Frontdesk assignment management
- **Dashboard**: Administrative interface with user and system management

### District Officers (Hierarchical by Level)

#### Level 0 - District Collector (`DC`)

- **Position**: District Collector
- **Designation**: DC
- **Capabilities**:
  - Complete oversight of all applications
  - Final approval authority
  - Officer assignment and delegation
  - District-wide reporting and analytics
- **Dashboard**: Executive dashboard with district-wide metrics

#### Level 1 - Additional District Collectors

- **ADC (Gangtok)** (`ADC_GTK`): Additional District Collector (Gangtok)
- **ADC (HQ)** (`ADC_HQ`): Additional District Collector (Headquarters)
- **Capabilities**:
  - Regional application oversight
  - Can handle high-priority applications
  - Officer assignment within their jurisdiction

#### Level 2 - Subdivisional Magistrates

- **SDM (Gangtok)** (`SDM_GTK`): Subdivisional Magistrate (Gangtok)
- **SDM (HQ)** (`SDM_HQ`): Subdivisional Magistrate (Headquarters)
- **Capabilities**:
  - Subdivisional application processing
  - Can process medium to high priority applications

#### Level 3 - Assistant Collector (`AC`)

- **Position**: Assistant Collector
- **Capabilities**:
  - Application processing and review
  - Can handle standard applications

#### Level 4 - Department Directors

- **DPO (DDMA)** (`DPO_DDMA`): Joint Director, Disaster Management
- **DD (Revenue)** (`DD_REV`): Deputy Director (Revenue)
- **DD (Acquisition)** (`DD_ACQ`): Deputy Director (Acquisition)
- **Revenue Officer** (`RO`): Legacy role for revenue matters
- **Deputy Director** (`DYDIR`): General deputy director role

#### Level 5 - Under Secretaries and Officers

- **US (Administration)** (`US_ADM`): Under Secretary (Administration)
- **Accounts Officer** (`AO`): Financial and accounts officer
- **TO (DDMA)** (`TO_DDMA`): Training Officer (DDMA)
- **AD (IT)** (`AD_IT`): Assistant Director (IT)
- **US (Election)** (`US_ELECTION`): Under Secretary (Election)

#### Level 6 - Office Superintendents

- **OS (COI & RC)** (`OS_COI_RC`): Office Superintendent (Certificate of Identity & Revenue Certificate)
- **OS (RC)** (`OS_RC`): Office Superintendent (Registration Certificate)
- **RI (Legal)** (`RI_LEGAL`): Revenue Inspector (Legal)

### Support Roles

#### Front Desk Officer (`FRONT_DESK`)

- **Level**: 7
- **Types**:
  - **General Frontdesk**: Can create and manage all applications
  - **Specific Frontdesk**: Assigned to specific officers, can only create applications for their assigned officers
- **Capabilities**:
  - Application creation and validation
  - Document verification
  - RR number assignment
  - Application forwarding to officers
  - Citizen interaction and support

#### Dispatch Handler (`DISPATCH_HANDLER`)

- **Level**: 7
- **Capabilities**:
  - Final application dispatch
  - Delivery coordination
  - Completion confirmation

### Assignment Hierarchy Rules

- Officers can only assign applications to officers at their level or lower
- Applications flow upward for escalation
- Frontdesk users can assign to their designated officers or general pool
- System prevents circular assignments and ensures proper workflow

---

## Application Management Workflow

### Application Status Flow

The system uses a well-defined status progression that ensures proper workflow management:

#### 1. DRAFT

- **Description**: Application created but not yet submitted
- **Who can create**: Front desk officers
- **Next status**: PENDING

#### 2. PENDING

- **Description**: Application submitted and awaiting validation
- **Who can process**: Front desk officers
- **Actions available**: Validate, Reject
- **Next status**: VALIDATED or CLOSED

#### 3. VALIDATED

- **Description**: Application validated with RR number assigned
- **Who can process**: Front desk officers
- **Actions available**: Open for processing
- **Next status**: OPEN

#### 4. OPEN

- **Description**: Application ready for officer assignment
- **Who can process**: Front desk officers
- **Actions available**: Assign to officer
- **Next status**: IN_PROGRESS

#### 5. IN_PROGRESS

- **Description**: Application being processed by assigned officer
- **Who can process**: Assigned officers
- **Actions available**: Process, Forward, Approve, Reject
- **Next status**: RESOLVED, CLOSED, or remain IN_PROGRESS (if forwarded)

#### 6. RESOLVED

- **Description**: Application successfully completed
- **Who can process**: Officers
- **Actions available**: Close, Reopen
- **Next status**: CLOSED, REOPENED

#### 7. CLOSED

- **Description**: Application closed (completed or rejected)
- **Who can process**: Officers
- **Actions available**: Reopen (in some cases)
- **Next status**: REOPENED (if applicable)

#### 8. REOPENED

- **Description**: Previously closed/resolved application reopened for further processing
- **Who can process**: Officers
- **Actions available**: Resume processing
- **Next status**: IN_PROGRESS, RESOLVED, CLOSED

### Workflow Actions

#### For Front Desk Officers

1. **Create Application**:

   - Fill citizen information
   - Select service category
   - Upload required documents
   - Save as draft or submit for validation

2. **Validate Application**:

   - Review citizen details
   - Verify uploaded documents
   - Assign RR (Receipt Registration) number
   - Accept or reject application

3. **Assign to Officers**:
   - Select appropriate officer based on application type
   - Add assignment instructions
   - Set priority and expected completion date

#### For Officers

1. **Pull Applications**:

   - View available applications in queue
   - Pull applications for processing
   - Self-assign from the general pool

2. **Process Applications**:

   - Review application details and documents
   - Add processing notes
   - Make decisions (approve/reject)
   - Forward to other officers if needed

3. **Forward Applications**:
   - Transfer to appropriate officer
   - Add forwarding instructions
   - Maintain audit trail

#### For Citizens (via Tracking)

1. **Track Application Status**:
   - Use RR number or phone number
   - View current status and progress
   - See processing history
   - Access submitted documents

---

## Dashboard Interface

Each user role has a customized dashboard designed for their specific responsibilities and workflow needs.

### Front Desk Dashboard

#### General Front Desk

- **Queue Overview**: View all applications in various states
- **Create New Application**: Start new citizen application
- **Validation Queue**: Applications pending validation
- **Assignment Management**: Assign validated applications to officers

#### Specific Front Desk (Officer-assigned)

- **Assigned Applications**: Applications for specific officers
- **Queue Management**: Manage applications for assigned officers
- **Direct Assignment**: Create and assign applications directly

### Officer Dashboards

#### DC (District Collector) Dashboard

- **Application Status Report**: District-wide application overview
- **Performance Metrics**: Processing times, completion rates
- **Officer Workload**: View assignments across all officers
- **Priority Applications**: High-priority or escalated applications

#### Officer Dashboard (All other officer roles)

- **Assigned Applications**: Applications assigned to the user
- **Pull Applications**: Available applications from general queue
- **Processing Metrics**: Personal performance statistics
- **Recent Activity**: Latest actions and updates

### Admin Dashboard

#### Administrative Functions

- **User Management**: Create, edit, and manage user accounts
- **Role Assignment**: Assign users to appropriate roles
- **Service Categories**: Manage application types and categories
- **Department Management**: Configure organizational structure
- **Section Management**: Define departmental sections
- **Frontdesk Management**: Assign frontdesk users to officers
- **System Settings**: Configure system-wide parameters

### Common Dashboard Elements

#### Navigation Sidebar

- **Responsive Design**: Adapts to screen size
- **Role-based Menu**: Shows relevant options for user role
- **Quick Actions**: Common tasks easily accessible
- **Settings Access**: User preferences and configuration

#### Status Cards

- **Application Counts**: Summary of applications by status
- **Performance Metrics**: Key performance indicators
- **Alerts**: Important notifications and deadlines
- **Quick Statistics**: At-a-glance information

#### Recent Activity

- **Timeline View**: Recent actions and status changes
- **Filter Options**: Filter by date, type, or status
- **Detailed History**: Complete audit trail access

---

## Document Management

### Supported File Types and Limits

#### Image Files

- **Formats**: JPEG, PNG, WebP
- **Maximum Size**: 5 MB per file
- **Extensions**: .jpg, .jpeg, .png, .webp

#### PDF Documents

- **Format**: PDF
- **Maximum Size**: 10 MB per file
- **Extension**: .pdf

### Document Types

1. **ID_PROOF**: Identity verification documents (Aadhaar, Voter ID, etc.)
2. **ADDRESS_PROOF**: Residence verification documents
3. **APPLICATION_FORM**: Completed application forms
4. **SUPPORTING_DOCUMENT**: Additional supporting materials
5. **PAYMENT_RECEIPT**: Fee payment confirmations

### Upload Process

1. **Drag & Drop**: Drag files directly to upload area
2. **File Browser**: Click to select files from device
3. **Multiple Upload**: Select and upload multiple files at once
4. **Preview**: View uploaded files before submission
5. **Document Type**: Assign appropriate document type to each file

### Storage and Security

#### AWS S3 Integration

- **Secure Storage**: Files stored in encrypted S3 buckets
- **Access Control**: Role-based file access permissions
- **Presigned URLs**: Temporary access links for security
- **Backup**: Automatic backup and redundancy

#### File Access Control

- **Role-based Access**: Users can only access relevant documents
- **Application Ownership**: Access restricted to application stakeholders
- **Audit Trail**: All file access logged for security
- **Direct Serving**: Files served directly without expiration for authorized users

### File Management Features

#### Preview and Download

- **In-browser Preview**: View PDFs and images directly
- **Download Option**: Download original files when needed
- **Mobile Optimization**: Responsive viewing on all devices

#### File Operations

- **Replace Documents**: Update files if corrections needed
- **Delete Files**: Remove unnecessary documents (with permissions)
- **Version History**: Track document changes and updates

---

## Application Tracking System

### Public Tracking Interface

Citizens can track their applications without logging into the system using:

#### Tracking Methods

1. **RR Number Tracking**:

   - Enter the Receipt Registration number
   - System validates and shows application status
   - Available immediately after application validation

2. **Phone Number Tracking**:
   - Enter the phone number used during application submission
   - Verify identity through OTP
   - View all applications associated with the phone number

#### OTP Verification Process

1. **Identity Verification**:

   - Enter phone number or email
   - Request OTP for verification
   - Enter received OTP to authenticate

2. **Security Features**:
   - OTP expires after set duration
   - Limited attempts to prevent abuse
   - Secure transmission and validation

### Tracking Information Available

#### Application Status

- **Current Status**: Real-time application state
- **Progress Percentage**: Visual progress indicator
- **Status Description**: Detailed explanation of current state
- **Expected Timeline**: Estimated completion timeframes

#### Processing History

- **Workflow Timeline**: Complete status change history
- **Officer Actions**: Who processed and when
- **Comments**: Processing notes and feedback
- **Document Status**: Upload and verification history

#### Application Details

- **Service Category**: Type of application
- **Submission Date**: When application was created
- **Last Updated**: Most recent activity timestamp
- **Reference Numbers**: RR number and internal IDs

#### Contact Information

- **Current Holder**: Who is currently processing
- **Department**: Responsible department
- **Office Location**: Where application is being processed

---

## Administrative Functions

### User Management

#### Creating Users

1. **Access Required**: Admin or Super Admin role
2. **User Information**:

   - Email address (unique identifier)
   - Full name
   - Phone number
   - Role assignment
   - Department and designation (for officers)

3. **Account Activation**:
   - Users receive activation email
   - Password setup required on first login
   - OTP verification may be required

#### Role Management

1. **Role Assignment**:

   - Select appropriate role from hierarchy
   - Assign to correct department/section
   - Set availability and permissions

2. **Role Changes**:
   - Update user roles as needed
   - Maintain audit trail of changes
   - Handle permission transitions

#### User Status Management

1. **Activate/Deactivate**:

   - Enable or disable user accounts
   - Preserve data while restricting access
   - Handle transitions in assignments

2. **Profile Updates**:
   - Update contact information
   - Change department/designation
   - Modify role assignments

### Service Category Management

#### Category Configuration

1. **Create Categories**:

   - Define service types
   - Set descriptions and requirements
   - Configure processing parameters

2. **Category Management**:
   - Edit existing categories
   - Activate/deactivate services
   - Set processing priorities

#### Assignment Rules

1. **Officer Mapping**:
   - Map categories to appropriate officers
   - Define escalation paths
   - Set processing requirements

### Department and Section Management

#### Organizational Structure

1. **Department Configuration**:

   - Create departments
   - Define hierarchy and reporting
   - Set operational parameters

2. **Section Management**:
   - Create departmental sections
   - Assign officers to sections
   - Configure workflows

#### Officer Assignment

1. **Frontdesk Assignment**:

   - Assign frontdesk users to officers
   - Configure general vs. specific assignments
   - Manage assignment relationships

2. **Workload Distribution**:
   - Balance assignments across officers
   - Monitor capacity and availability
   - Optimize processing efficiency

### System Configuration

#### Settings Management

1. **System Parameters**:

   - Configure application limits
   - Set timeout values
   - Define system behaviors

2. **Notification Settings**:
   - Configure email templates
   - Set notification triggers
   - Manage communication preferences

#### Security Configuration

1. **Access Control**:

   - Set permission levels
   - Configure authentication requirements
   - Manage security policies

2. **Audit Configuration**:
   - Set logging levels
   - Configure retention policies
   - Define audit requirements

---

## Technical Specifications

### System Architecture

#### Frontend Technologies

- **Framework**: Next.js 15.3.2 with App Router
- **Language**: TypeScript for type safety
- **Styling**: Tailwind CSS with custom components
- **UI Framework**: Radix UI components
- **State Management**: React hooks and context
- **Forms**: React Hook Form with Zod validation

#### Backend Technologies

- **API**: Next.js API routes (serverless functions)
- **Authentication**: NextAuth.js with custom providers
- **Database**: PostgreSQL with Prisma ORM
- **File Storage**: AWS S3 with SDK integration
- **Email**: Nodemailer for notifications
- **Validation**: Zod schemas for data validation

#### Database Schema

##### Core Tables

- **users**: User accounts and authentication
- **user_settings**: User preferences and configuration
- **citizen_profiles**: Citizen information
- **officer_profiles**: Officer details and assignments
- **applications**: Core application data
- **application_workflow**: Status change history
- **application_validation**: Validation records
- **application_audit_logs**: Complete audit trail

##### Supporting Tables

- **service_categories**: Application types
- **departments**: Organizational units
- **sections**: Department subdivisions
- **documents**: File metadata and references
- **document_requests**: Document requirement tracking
- **notifications**: User notifications
- **officer_assignments**: Application assignments
- **frontdesk_officers**: Frontdesk-officer relationships

#### Security Features

##### Authentication & Authorization

- **Secure Sessions**: NextAuth.js session management
- **Role-based Access**: Hierarchical permission system
- **Route Protection**: Middleware-based route security
- **OTP Verification**: Email-based identity verification

##### Data Protection

- **Input Validation**: Server-side validation with Zod
- **SQL Injection Prevention**: Parameterized queries with Prisma
- **File Upload Security**: Type and size validation
- **Access Logging**: Comprehensive audit trails

##### Infrastructure Security

- **HTTPS**: Encrypted communication
- **CORS**: Cross-origin request protection
- **Rate Limiting**: API abuse prevention
- **Environment Variables**: Secure configuration management

### Performance Optimizations

#### Frontend Performance

- **Code Splitting**: Automatic route-based splitting
- **Image Optimization**: Next.js Image component
- **Static Generation**: Pre-built pages where possible
- **Caching**: Browser and CDN caching strategies

#### Backend Performance

- **Database Indexing**: Optimized query performance
- **Connection Pooling**: Efficient database connections
- **Caching**: Redis for session and data caching
- **File CDN**: S3 CloudFront distribution

#### Mobile Optimization

- **Responsive Design**: Mobile-first approach
- **Progressive Web App**: Offline capabilities
- **Touch Optimization**: Mobile-friendly interactions
- **Performance Budget**: Lightweight mobile experience

---

## Troubleshooting

### Common Issues and Solutions

#### Authentication Problems

**Issue: Cannot log in with correct credentials**

- **Solution**:
  - Check if account is active
  - Verify email address spelling
  - Try password reset if needed
  - Contact administrator for account status

**Issue: OTP not received**

- **Solution**:
  - Check spam/junk folder
  - Verify email address is correct
  - Wait 60 seconds before requesting new OTP
  - Try alternative email if available

#### Application Issues

**Issue: Cannot create new application**

- **Solution**:
  - Verify you have frontdesk role
  - Check if service categories are available
  - Ensure all required fields are filled
  - Try refreshing the page

**Issue: Documents not uploading**

- **Solution**:
  - Check file size (max 5MB for images, 10MB for PDFs)
  - Verify file format is supported
  - Check internet connection
  - Try uploading one file at a time

**Issue: Application not found in tracking**

- **Solution**:
  - Verify RR number is entered correctly
  - Check if application has been validated (RR number assigned)
  - Try using phone number if RR number unavailable
  - Contact frontdesk for assistance

#### Dashboard Issues

**Issue: Dashboard not loading or showing errors**

- **Solution**:
  - Refresh the browser page
  - Clear browser cache and cookies
  - Try different browser
  - Check internet connection
  - Log out and log back in

**Issue: Applications not appearing in queue**

- **Solution**:
  - Check filter settings
  - Verify role permissions
  - Refresh the page
  - Check application status criteria

#### Performance Issues

**Issue: System running slowly**

- **Solution**:
  - Check internet connection speed
  - Close unnecessary browser tabs
  - Clear browser cache
  - Try during off-peak hours
  - Contact IT support if persistent

### Error Messages

#### Common Error Messages and Meanings

**"Unauthorized access"**

- Your session has expired or you don't have permission
- Solution: Log out and log back in

**"File too large"**

- Uploaded file exceeds size limits
- Solution: Reduce file size or use different format

**"Invalid file type"**

- File format not supported
- Solution: Convert to supported format (PDF, JPG, PNG)

**"Application not found"**

- Application ID or RR number invalid
- Solution: Verify the number or contact support

**"Database connection error"**

- Temporary system issue
- Solution: Wait and try again, contact support if persistent

### Getting Help

#### Internal Support Channels

1. **System Administrator**:

   - Contact for account issues
   - Role and permission problems
   - System configuration needs

2. **IT Support**:

   - Technical problems
   - Performance issues
   - Browser compatibility

3. **Training Resources**:
   - User guides and tutorials
   - Video walkthroughs
   - Best practices documentation

#### Self-Help Resources

1. **User Manual**: This comprehensive guide
2. **FAQ Section**: Common questions and answers
3. **Video Tutorials**: Step-by-step visual guides
4. **Practice Environment**: Safe environment for learning

---

## Support

### Contact Information

#### System Administration

- **Email**: admin@district-office.gov.in
- **Phone**: +91-XXXX-XXXXXX
- **Office Hours**: 9:00 AM - 5:00 PM (Monday-Friday)

#### Technical Support

- **Email**: support@district-office.gov.in
- **Phone**: +91-XXXX-XXXXXX
- **Emergency**: +91-XXXX-XXXXXX (for critical issues)

#### Training and Documentation

- **Training Requests**: training@district-office.gov.in
- **Documentation Updates**: docs@district-office.gov.in

### Service Level Agreements

#### Response Times

- **Critical Issues**: Within 1 hour
- **High Priority**: Within 4 hours
- **Medium Priority**: Within 24 hours
- **Low Priority**: Within 72 hours

#### Support Hours

- **Business Hours**: 9:00 AM - 5:00 PM (Monday-Friday)
- **Emergency Support**: 24/7 for critical system issues
- **Planned Maintenance**: Announced 48 hours in advance

### Escalation Procedures

#### Level 1: Frontdesk/User Support

- Initial troubleshooting
- Common issue resolution
- Basic training assistance

#### Level 2: Technical Support

- System configuration issues
- Integration problems
- Performance optimization

#### Level 3: System Administration

- Critical system failures
- Security incidents
- Major configuration changes

#### Level 4: Vendor Support

- Infrastructure issues
- Third-party service problems
- Advanced technical problems

### Feedback and Suggestions

#### How to Provide Feedback

1. **Email**: feedback@district-office.gov.in
2. **In-system Feedback**: Use built-in feedback forms
3. **Training Sessions**: Provide feedback during training
4. **User Meetings**: Participate in user feedback sessions

#### Types of Feedback Welcome

- **Usability Issues**: Interface problems or confusion
- **Feature Requests**: New functionality suggestions
- **Process Improvements**: Workflow optimization ideas
- **Performance Issues**: Speed or reliability problems
- **Training Needs**: Additional learning requirements

### Continuous Improvement

#### Regular Updates

- **Monthly**: Minor bug fixes and improvements
- **Quarterly**: Feature updates and enhancements
- **Annually**: Major version releases

#### User Involvement

- **Beta Testing**: Early access to new features
- **User Acceptance Testing**: Feedback on major changes
- **Training Programs**: Regular skill development
- **User Group Meetings**: Community feedback sessions

---

## Conclusion

This user manual provides comprehensive coverage of the District BI application management system. The system is designed to streamline government service delivery while maintaining proper security, audit trails, and user experience.

For the most current information and updates, please refer to the system administrators or check the in-system help documentation.

**Version**: 1.0  
**Last Updated**: December 2024  
**Next Review**: March 2025

---

_This manual is a living document and will be updated regularly to reflect system changes and user feedback._
