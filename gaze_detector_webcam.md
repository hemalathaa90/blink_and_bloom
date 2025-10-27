Eye gaze estimation using a webcam. 100 lines of code
Amit Aflalo
Amit Aflalo

Follow
7 min read
·
Jan 23, 2022
189


3


Let's look at the following situation, you're seated at a library and you just saw the most beautiful woman sitting at the other side of the library. And oops, she caught you staring. she estimated that your eye gaze was on her, and you noticed that she caught you by understanding that her gaze was directed to you.

Eye Gaze: the point on which a person’s eyes are focused

Like many tasks that our amazing brain does so effortlessly, This is a hard problem to “teach” a computer, as we need to perform several hard tasks:

Face Recognition
Eyes Recognition, And pupil localization
Determine 3D positioning of the head and eyes
Commercial gaze trackers come in all shapes and sizes. From Glasses to screen base solution. But although these products are highly accurate, they are using proprietary software and hardware, and are very expensive.

Let's start building our gaze tracker
To keep this blog at a reasonable length, we will build a basic form of gaze tracking. with a couple of rough estimations. And we will not determine the exact gaze point, but the gaze direction.


Gaze is relative to the camera, and I'm sitting under the camera
Face Recognition and pupil localization

For this task, we will use MediaPipe, an amazing deep learning framework that was developed by Google, it will give us 468 2D face landmarks in real-time, using very few resources.

Let's look at some code:

import mediapipe as mp
import cv2
import gaze

mp_face_mesh = mp.solutions.face_mesh # initialize the face mesh model

# camera stream:
cap = cv2.VideoCapture(1)
with mp_face_mesh.FaceMesh(
        max_num_faces=1,                            # number of faces to track in each frame
        refine_landmarks=True,                      # includes iris landmarks in the face mesh model
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5) as face_mesh:
    while cap.isOpened():
        success, image = cap.read()
        if not success:                            # no frame input
            print("Ignoring empty camera frame.")
            continue
        # To improve performance, optionally mark the image as not writeable to
        # pass by reference.
        image.flags.writeable = False
        image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB) # frame to RGB for the face-mesh model
        results = face_mesh.process(image)
        image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)

        if results.multi_face_landmarks:
            gaze.gaze(image, results.multi_face_landmarks[0])

        cv2.imshow('output window', image)
        if cv2.waitKey(2) & 0xFF == 27:          
            break
cap.release()

Nothing fancy here, in line 27 we pass the current frame and face landmark points that we acquired from the mediapipe framework to our gaze function, that's where all the fun is.

2D from 3D?
Gaze tracking is a 3D problem, but we stated in the title that we are only using a simple webcam, how could it be?

We will use some geek magic (Linear Algebra) to make it happen. First, let's get a sense of how our camera “sees” the world.


Image from OpenCV docs
The 2D image that you see when looking at the screen is denoted in blue, and the 3D world is denoted by the world coordinates system. what is the connection between them? you ask. How can we map the 3D world from a 2D image, or at least get a rough estimation? Let's figure it out!

We are all alike
We as humans are more similar than we think, we can take a generic 3D model of a human face, and it will be a good estimation of the 3D proportions for most of the population.

Let's use such a model to define a 3D coordinates system, we will set the tip of the nose as the origin of our coordinate system, and relative to that we will define 5 more points as follows:

def gaze(frame, points):
    '''
    2D image points.
    relative takes mediapipe points that normelized to [-1, 1] and returns image points
    at (x,y) format
    '''
    image_points = np.array([
        relative(points.landmark[4], frame.shape),    # Nose tip
        relative(points.landmark[152], frame.shape),  # Chin
        relative(points.landmark[263], frame.shape),  # Left eye left corner
        relative(points.landmark[33], frame.shape),   # Right eye right corner
        relative(points.landmark[287], frame.shape),  # Left Mouth corner
        relative(points.landmark[57], frame.shape)    # Right mouth corner
    ], dtype="double")

    # 3D model points.
    model_points = np.array([
        (0.0, 0.0, 0.0),       # Nose tip
        (0, -63.6, -12.5),     # Chin
        (-43.3, 32.7, -26),    # Left eye left corner
        (43.3, 32.7, -26),     # Right eye right corner
        (-28.9, -28.9, -24.1), # Left Mouth corner
        (28.9, -28.9, -24.1)   # Right mouth corner
    ])
    '''
    3D model eye points
    The center of the eye ball
    '''
    Eye_ball_center_right = np.array([[-29.05],[32.7],[-39.5]])
    Eye_ball_center_left = np.array([[29.05],[32.7],[-39.5]])

Now we have 6 2D points that we acquired from mediapipe, and the corresponding 3D points in the world coordinates system that we defined. Our goal is to learn about the change of the 3D location of these points and do so by using our 2D image. How can we do it?

pinhole camera model to the rescue
The pinhole camera model is a mathematical model that describes the relationship between points in the 3D world and their projection to the 2D image plane. From this model we will derive the following Equation :

Press enter or click to view image in full size

Using this equation we can obtain a transformation to project a 3D point into the image 2D image plane. But can we solve it? well, at least not by simple algebraic tools, but don't you worry, that's where OpenCV comes to the rescue with the solvePnP function, look at the link for a more in-depth explanation.

Get Amit Aflalo’s stories in your inbox
Join Medium for free to get updates from this writer.

Enter your email
Subscribe
We will take our 6 image points and corresponding 3D model points, and pass them to the solvepnp function. We will get in return a rotation and translation vector and therefore a transformation that will help us project a point from the 3D world point into the 2D plane.

look here to learn how to estimate the camera matrix, or here to learn how to calibrate your own camera.

 '''
    camera matrix estimation
    '''
    focal_length = frame.shape[1]
    center = (frame.shape[1] / 2, frame.shape[0] / 2)
    camera_matrix = np.array(
        [[focal_length, 0, center[0]],
         [0, focal_length, center[1]],
         [0, 0, 1]], dtype="double"
    )

    dist_coeffs = np.zeros((4, 1))  # Assuming no lens distortion
    (success, rotation_vector, translation_vector) = cv2.solvePnP(model_points, image_points, camera_matrix,
                                                                  dist_coeffs, flags=cv2.cv2.SOLVEPNP_ITERATIVE)

Using our new transformation, we can take a point from 3D space and project it to the 2D image plane. Therefore we will get the notion of where this 3D point points to in space. And that is how it looks with the point (0,0,150).


2D from 3D
Now we will take the pupil 2D image coordinates and project them to our 3D model coordinates. Just the opposite of what we were doing in the head pose estimation part.

# project image point to world point
_ ,transformation, _ = cv2.estimateAffine3D(image_points1, model_points) # image cord to world cord tramsformation
pupil_world_cord =  transformation @ np.array([[left_pupil[0],left_pupil[1],0,1]]).T # Transformation * pupil image point vector

As seen in the code snippet we will use OpenCV estimateAffline3D function. This function uses the same principles of the pinhole camera model that we discussed. It takes two sets of 3D points and returns a transformation between the first set of and the second. But wait, our image points are 2D, how it's possible? well, we will take our image points (x,y) and pass them as (x,y,0), and therefore will get a transformation between our image coordinates to our model coordinates. And using this method we can get the pupil 3D model points from the 2D image point that we acquired from mediapipe.

Note: its not a very accurate estimation

Press enter or click to view image in full size

I didn't tell you, but If you look above in the second code snippet, you can see that we have the eye center model points (3D), and we just acquired the pupil 3D model point using estimateAffline3D. now to find the gaze direction we need to solve this line plane intersection problem, as described in the drawing above. the point that we are trying to find is denoted by S. let's project the point into the 2D plane.
    # project pupil image point into world point 
    pupil_world_cord =  transformation @ np.array([[left_pupil[0],left_pupil[1],0,1]]).T
    
    # 3D gaze point (10 is arbitrary value denoting gaze distance)
    S = Eye_ball_center_left + (pupil_world_cord - Eye_ball_center_left) * 10
    
    # Project a 3D gaze point onto the image plane.
    (eye_pupil2D, jacobian) = cv2.projectPoints((int(S[0]), int(S[1]), int(S[2])), rotation_vector,
                                                    translation_vector, camera_matrix, dist_coeffs)
    # Draw gaze line into screen 
    p1  = (int(left_pupil[0]), int(left_pupil[1]))
    p2 = (int(eye_pupil2D[0][0][0]) , int(eye_pupil2D[0][0][1]))
    cv2.line(frame, p1, p2, (0, 0, 255), 2)

Note: In line 5 we use the “magic” number 10, that's because that we don't know the distance of the subject from the camera. So the distance between the pupil to the camera that is denoted by t in the drawing is unknown

Are we done?
Well not yet. Now we need to account for head movement, and in that way, our gaze tracker will be resilient to head movement. Let’s use our head pose estimation from the beginning.

Press enter or click to view image in full size

The 2D location of the pupil is denoted by the point p, point g is the gaze + head rotation projection, and point h is the head pose projection. now to get clean gaze information we substruct vector B from vector A.


# Project a 3D gaze direction onto the image plane.
(eye_pupil2D, _) = cv2.projectPoints((int(S[0]), int(S[1]), int(S[2])), rotation_vector,
                                                translation_vector, camera_matrix, dist_coeffs)
# project 3D head pose into the image plane
(head_pose, _) = cv2.projectPoints((int(pupil_world_cord[0]), int(pupil_world_cord[1]), int(40)), rotation_vector,
                                                translation_vector, camera_matrix, dist_coeffs)

# correct gaze for head rotation
gaze = left_pupil + (eye_pupil2D[0][0] - left_pupil) - (head_pose[0][0] - left_pupil)

in line 5 we use the magic number 40, for the same reason that we used 10 in the snippet above.

THE END
And we're done, at least for now. You can see the complete code on my Github page, and run it on your machine.

GitHub - amitt1236/Gaze_estimation
You can't perform that action at this time. You signed in with another tab or window. You signed out in another tab or…
github.com

But are we really done?
well, we cut some corners to keep this blog at a reasonable length. So we can change a few things to improve accuracy:

Calibrate the camera properly and do not use an estimation.
Using both eyes, Calculate the mean between the two locations. (we only used the left eye)
We are using the estimateAffine3D method to project the 2d pupil location into the 3d space, but it's not an accurate Estimation. We can use the eye structure and the pupil location in the eye socket to deduce the 3d location of the pupil.
We completely ignored the distance of the subject from the camera. Because of that we only got a gaze direction and not a gaze point. it’s probably the most important part, but also the most complex.