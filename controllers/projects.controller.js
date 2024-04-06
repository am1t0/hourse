import { asyncHandler } from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import { Team } from '../modals/team.modal.js';
import ApiResponse from '../utils/ApiResponse.js';
import User from '../modals/user.modal.js';
import { Project } from '../modals/project.modal.js'; 
import { Task } from '../modals/tasks.modal.js';


const createProject = asyncHandler(async (req, res) => {
  try {
    // taking details regarding project 
    const { name,projectOverview, projectObjectives, techStack,teamId} = req.body;

    // Check if the user is the owner of the specified team
    const team = await Team.findById(teamId);
    if (!team || team.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Forbidden: User does not have permission' });
    }

    // Create a new project document
    const newProject = new Project({
      name,
      projectOverview,
      projectObjectives,
      techStack,
      team: teamId,
      announcements: [],
      tasks: [],
      repoInitialized:true,
    });
    console.log('Project is ',projectOverview);

    // Save the new project to the database
    const savedProject = await newProject.save();

    // adding the project into it's team
    team.projects.push(savedProject._id);
    await team.save();

    return res.status(200).json(new ApiResponse(200,savedProject, 'Projects created successfully'));

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const addTaskToProject = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { taskName, description, username, status, deadline } = req.body;

  // Validate required fields
  if (!taskName || !description || !username || !status || !deadline) {
    return res.status(400).json({ success: false, message: "All fields are required" });
  }

  try {
    // For simplicity, assuming username is unique
    // You may want to add additional validation or fetch user ID based on the username
    const user = await User.findOne({ username });

    // user exists or not 
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // 
    const project = await Project.findById(projectId)

    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    const teamId = project.team;

    const team = await Team.findById(teamId);

    if(team.owner.toString() !== req.user._id.toString()){
      return  res.status(401).json({ success: false, message: "Unauthorized!" });
    }


    if (!team) {
      return res.status(403).json({ success: false, message: "Project does not have an associated team" });
    }
    
    // Create a new task instance
    const newTask = new Task({
      taskName,
      description,
      member: user._id, // Assign the user ID to the task
      status,
      deadline,
    });

    // Save the new task to the database
    const savedTask = await newTask.save();

    // For simplicity, assuming projectId is valid
    const updatedProject = await Project.findByIdAndUpdate(
      projectId,
      { $push: { tasks: savedTask._id } },
      { new: true }
    );

    return res.status(201).json({
      success: true,
      project: updatedProject,
      task: savedTask,
    });
  } catch (error) {
    console.error("Error adding task to project:", error.message);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

const repoCheck = asyncHandler(async (req, res) => {
  try {
    const { repoName, owner, projectId } = req.body;

    if (!repoName || !projectId || !owner) {
      return res.status(400).json({ message: 'Invalid request. Missing or empty parameters.' });
    }

    // Assuming you have a project model
    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Update the project details with repoName and owner
    project.repo = {
      repoName: repoName,
      owner: owner,
    };

    console.log('Project after repo Details is : ',project);

    // Update the project to indicate that the repository has been initialized
    project.repoInitialized = true;

    await project.save();

    res.status(201).json({ message: 'Repository created and project updated' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

const getProject = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  try {
    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    res.status(200).json({ project });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});




export { createProject ,addTaskToProject,repoCheck,getProject};
