#include <stdio.h>
#include <time.h>

#include <string>

#include "opencv2/calib3d/calib3d.hpp"
#include "opencv2/core/core.hpp"
#include "opencv2/highgui/highgui.hpp"
#include "opencv2/imgproc/imgproc.hpp"

using namespace cv;
using namespace std;

/**
 * usage sentence
 */
const char * usage =
	" \nexample command line for calibration from a live feed.\n"
	"   calibration  -w 4 -h 5 -s 0.025 -o camera.yml -op -oe\n"
	" \n"
	" example command line for calibration from a list of stored images:\n"
	"   imagelist_creator image_list.xml *.png\n"
	"   calibration -w 4 -h 5 -s 0.025 -o camera.yml -op -oe image_list.xml\n"
	" where image_list.xml is the standard OpenCV XML/YAML\n"
	" use imagelist_creator to create the xml or yaml list\n"
	" file consisting of the list of strings, e.g.:\n"
	" \n"
	"<?xml version=\"1.0\"?>\n"
	"<opencv_storage>\n"
	"<images>\n"
	"view000.png\n"
	"view001.png\n"
	"<!-- view002.png -->\n"
	"view003.png\n"
	"view010.png\n"
	"one_extra_view.jpg\n"
	"</images>\n"
	"</opencv_storage>\n";

/**
 * Help displayed at program launch when interactive calibration is on
 */
const char * liveCaptureHelp =
	"When the live video from camera is used as input, the following hot-keys "
	"may be used:\n"
	"  <ESC>, 'q' - quit the program\n"
	"  'g' - start capturing images\n"
	"  'u' - switch undistortion on/off\n";

/**
 * Help function.
 * Display :
 * 	- complete arguments description
 * 	- usage sentence
 * 	- help sentence
 * @see usage
 * @see liveCaptureHelp
 */
void help()
{
	printf(
		"This is a camera calibration sample.\n"
		"Usage: calibration\n"
		"     -w <board_width>         # the number of inner corners per one of board dimension\n"
		"     -h <board_height>        # the number of inner corners per another board dimension\n"
		"     [-n <number_of_frames>]  # the number of frames to use for calibration\n"
		"                              # (if not specified, it will be set to the number\n"
		"                              #  of board views actually available)\n"
		"     [-d <delay>]             # a minimum delay in ms between subsequent attempts to capture a next view\n"
		"                              # (used only for video capturing)\n"
		"     [-s <squareSize>]        # square size in some user-defined units (1 by default)\n"
		"     [-o <out_camera_params>] # the output filename for intrinsic [and extrinsic] parameters\n"
		"     [-op]                    # write detected feature points\n"
		"     [-oe]                    # write extrinsic parameters\n"
		"     [-zt]                    # assume zero tangential distortion\n"
		"     [-a <aspectRatio>]       # fix aspect ratio (fx/fy)\n"
		"     [-p]                     # fix the principal point at the center\n"
		"     [-v]                     # flip the captured images around the horizontal axis\n"
		"     [-V]                     # use a video file, and not an image list, uses\n"
		"                              # [input_data] string for the video file name\n"
		"     [-su]                    # show undistorted images after calibration\n"
		"     [input_data]             # input data, one of the following:\n"
		"                              #  - text file with a list of the images of the board\n"
		"                              #    the text file can be generated with imagelist_creator\n"
		"                              #  - name of video file with a video of the board\n"
		"                              # if input_data not specified, a live view from the camera is used\n"
		"     [--device [0|1]]         # internal or external camera device\n"
		"     [--reduce <reduce factor>] # image reduce factor\n"
		"     [-m] || [--manual]       # trigger captures manualy with 'c' key\n"
		"\n");
	printf("\n%s", usage);
	printf("\n%s", liveCaptureHelp);
}

typedef enum { DETECTION = 0, CAPTURING = 1, CALIBRATED } CalibState;

/**
 * Compute reprojection errors from calibrated camera by comparing reprojected
 * object points to image extracted points
 * @param objectPoints 3D object points
 * @param imagePoints 2D image points
 * @param rvecs rotation vectors
 * @param tvecs translation vectors
 * @param cameraMatrix calibrated camera matrix
 * @param distCoeffs distorsion coefficients
 * @param perViewErrors Per View errors ?
 * @return
 */
static double computeReprojectionErrors(
	const vector<vector<Point3f> > & objectPoints,
	const vector<vector<Point2f> > & imagePoints,
	const vector<Mat> & rvecs,
	const vector<Mat> & tvecs,
	const Mat & cameraMatrix,
	const Mat & distCoeffs,
	vector<float> & perViewErrors)
{
	vector<Point2f> imagePoints2;
	int i, totalPoints = 0;
	double totalErr = 0, err;
	perViewErrors.resize(objectPoints.size());

	for (i = 0; i < (int) objectPoints.size(); i++)
	{
		projectPoints(Mat(objectPoints[i]),
					  rvecs[i],
					  tvecs[i],
					  cameraMatrix,
					  distCoeffs,
					  imagePoints2);
		err = norm(Mat(imagePoints[i]), Mat(imagePoints2), CV_L2);
		int n = (int) objectPoints[i].size();
		perViewErrors[i] = (float) std::sqrt(err * err / n);
		totalErr += err * err;
		totalPoints += n;
	}

	return std::sqrt(totalErr / totalPoints);
}

/**
 * Compute chessboard corners from bordSize and squareSize
 * @param boardSize board size (i.e. [6,8])
 * @param squareSize square size on the board (i.e. 30 mm)
 * @param corners inner corner points on the chessboard
 */
static void calcChessboardCorners(Size boardSize,
								  float squareSize,
								  vector<Point3f> & corners)
{
	corners.resize(0);

	for (int i = 0; i < boardSize.height; i++)
	{
		for (int j = 0; j < boardSize.width; j++)
		{
			corners.push_back(
				Point3f(float(j * squareSize), float(i * squareSize), 0));
		}
	}
}

/**
 * Run Calibration procedure
 * @param imagePoints chessboard image points on all views
 * @param imageSize image size
 * @param boardSize board size
 * @param squareSize square size on the chessboard
 * @param aspectRatio image aspect ratio
 * @param flags OpenCV calibration flags.
 * 	- CV_CALIB_USE_INTRINSIC_GUESS  1
 * 	- CV_CALIB_FIX_ASPECT_RATIO     2
 * 	- CV_CALIB_FIX_PRINCIPAL_POINT  4
 * 	- CV_CALIB_ZERO_TANGENT_DIST    8
 * 	- CV_CALIB_FIX_FOCAL_LENGTH 16
 * 	- CV_CALIB_FIX_K1  32
 * 	- CV_CALIB_FIX_K2  64
 * 	- CV_CALIB_FIX_K3  128
 * 	- CV_CALIB_FIX_K4  2048
 * 	- CV_CALIB_FIX_K5  4096
 * 	- CV_CALIB_FIX_K6  8192
 * 	- CV_CALIB_RATIONAL_MODEL 16384
 * @param cameraMatrix 3x3 camera matrix.
 * \f[
 * A = \left(
 * 	\begin{array}{ccc}
 * 		f_x & 0 & c_x \\
 * 		0 & f_y & c_y \\
 * 		0 & 0 & 1
 * 	\end{array}
 * \right)
 * \f]
 * @param distCoeffs 1x8 distorsion coefficients vector.
 * Such as if
 * \f[
 * \left(
 * 	\begin{array}{c}
 * 		x \\
 * 		y \\
 * 		y
 * 	\end{array}
 * \right) = R
 * \left(
 * 	\begin{array}{c}
 * 		X \\
 * 		Y \\
 * 		Z
 * 	\end{array}
 * \right) + t
 * \f]
 * \f$x' = \frac{x}{z}\f$
 *
 * \f$y' = \frac{y}{z}\f$
 *
 * \f$x'' = x' \frac{1+k_1r^2+k_2r^4+k_3r^6}{1+k_4r^2+k_5r^4+k_6r^6}
 * + 2p_1x'y' + p_2(r^2 + 2x'^2)\f$
 *
 * \f$ y'' = y' \frac{1+k_1r^2+k_2r^4+k_3r^6}{1+k_4r^2+k_5r^4+k_6r^6}
 * + 2p_2x'y' + p_1(r^2 + 2y'^2) \f$ where
 * \f$ r^2 = x'^2 + y'^2\f$
 *
 * \f$u = f_x \cdot x'' + c_x\f$
 *
 * \f$v = f_y \cdot y'' + c_y\f$
 * @param rvecs Rotation vectors for each view
 * @param tvecs TRanslation vector for each view
 * @param reprojErrs Points reprojection errors
 * @param totalAvgErr total average error
 * @return true if calibration went right
 */
static bool runCalibration(vector<vector<Point2f> > imagePoints,
						   Size imageSize,
						   Size boardSize,
						   float squareSize,
						   float aspectRatio,
						   int flags,
						   Mat & cameraMatrix,
						   Mat & distCoeffs,
						   vector<Mat> & rvecs,
						   vector<Mat> & tvecs,
						   vector<float> & reprojErrs,
						   double & totalAvgErr)
{
	cameraMatrix = Mat::eye(3, 3, CV_64F);
	if (flags & CV_CALIB_FIX_ASPECT_RATIO)
	{
		cameraMatrix.at<double>(0, 0) = aspectRatio;
	}

	distCoeffs = Mat::zeros(8, 1, CV_64F);

	vector<vector<Point3f> > objectPoints(1);
	calcChessboardCorners(boardSize, squareSize, objectPoints[0]);

	objectPoints.resize(imagePoints.size(), objectPoints[0]);

	double rms = calibrateCamera(objectPoints,
								 imagePoints,
								 imageSize,
								 cameraMatrix,
								 distCoeffs,
								 rvecs,
								 tvecs,
								 flags | CV_CALIB_FIX_K4 | CV_CALIB_FIX_K5);
	///*|CV_CALIB_FIX_K3*/|CV_CALIB_FIX_K4|CV_CALIB_FIX_K5);
	printf("RMS error reported by calibrateCamera: %g\n", rms);

	bool ok = checkRange(cameraMatrix) && checkRange(distCoeffs);

	totalAvgErr = computeReprojectionErrors(objectPoints,
											imagePoints,
											rvecs,
											tvecs,
											cameraMatrix,
											distCoeffs,
											reprojErrs);

	return ok;
}

/**
 * Save camera calibration matrix to file
 * @param filename file name to save data
 * @param imageSize image size
 * @param boardSize board size
 * @param squareSize board squares size
 * @param aspectRatio aspect ratio
 * @param flags CV calibration flags
 * @param cameraMatrix camera matrix
 * @param distCoeffs distorsion coefficients
 * @param rvecs rotation vectors
 * @param tvecs translation vectors
 * @param reprojErrs reprojection errors
 * @param imagePoints image points
 * @param totalAvgErr tota average error
 */
void saveCameraParams(const string & filename,
					  Size imageSize,
					  Size boardSize,
					  float squareSize,
					  float aspectRatio,
					  int flags,
					  const Mat & cameraMatrix,
					  const Mat & distCoeffs,
					  const vector<Mat> & rvecs,
					  const vector<Mat> & tvecs,
					  const vector<float> & reprojErrs,
					  const vector<vector<Point2f> > & imagePoints,
					  double totalAvgErr)
{
	FileStorage fs(filename, FileStorage::WRITE);

	time_t t;
	time(&t);
	struct tm * t2 = localtime(&t);
	char buf[1024];
	strftime(buf, sizeof(buf) - 1, "%c", t2);

	fs << "calibration_time" << buf;

	if (!rvecs.empty() || !reprojErrs.empty())
	{
		fs << "nframes" << (int) std::max(rvecs.size(), reprojErrs.size());
	}
	fs << "image_width" << imageSize.width;
	fs << "image_height" << imageSize.height;
	fs << "board_width" << boardSize.width;
	fs << "board_height" << boardSize.height;
	fs << "square_size" << squareSize;

	if (flags & CV_CALIB_FIX_ASPECT_RATIO)
		fs << "aspectRatio" << aspectRatio;

	if (flags != 0)
	{
		sprintf(buf,
				"flags: %s%s%s%s",
				flags & CV_CALIB_USE_INTRINSIC_GUESS ? "+use_intrinsic_guess" : "",
				flags & CV_CALIB_FIX_ASPECT_RATIO ? "+fix_aspectRatio" : "",
				flags & CV_CALIB_FIX_PRINCIPAL_POINT ? "+fix_principal_point" : "",
				flags & CV_CALIB_ZERO_TANGENT_DIST ? "+zero_tangent_dist" : "");
		cvWriteComment(*fs, buf, 0);
	}

	fs << "flags" << flags;

	fs << "camera_matrix" << cameraMatrix;
	fs << "distortion_coefficients" << distCoeffs;

	fs << "avg_reprojection_error" << totalAvgErr;
	if (!reprojErrs.empty())
	{
		fs << "per_view_reprojection_errors" << Mat(reprojErrs);
	}

	if (!rvecs.empty() && !tvecs.empty())
	{
		Mat bigmat((int) rvecs.size(), 6, CV_32F);
		for (int i = 0; i < (int) rvecs.size(); i++)
		{
			Mat r = bigmat(Range(i, i + 1), Range(0, 3));
			Mat t = bigmat(Range(i, i + 1), Range(3, 6));
			rvecs[i].copyTo(r);
			tvecs[i].copyTo(t);
		}
		cvWriteComment(*fs,
					   "a set of 6-tuples (rotation vector + translation "
					   "vector) for each view",
					   0);
		fs << "extrinsic_parameters" << bigmat;
	}

	if (!imagePoints.empty())
	{
		Mat imagePtMat(
			(int) imagePoints.size(), imagePoints[0].size(), CV_32FC2);
		for (int i = 0; i < (int) imagePoints.size(); i++)
		{
			Mat r = imagePtMat.row(i).reshape(2, imagePtMat.cols);
			Mat imgpti(imagePoints[i]);
			imgpti.copyTo(r);
		}
		fs << "image_points" << imagePtMat;
	}
}

/**
 * Read string list from FileStorage
 * @param filename the file name to read
 * @param l string vector
 * @return true if everything went right, false otherwise
 */
static bool readStringList(const string & filename, vector<string> & l)
{
	l.resize(0);
	FileStorage fs(filename, FileStorage::READ);
	if (!fs.isOpened())
	{
		return false;
	}
	FileNode n = fs.getFirstTopLevelNode();
	if (n.type() != FileNode::SEQ)
	{
		return false;
	}
	FileNodeIterator it = n.begin(), it_end = n.end();
	for (; it != it_end; ++it)
	{
		l.push_back((string) *it);
	}
	return true;
}

/**
 * Run Calibration and save results to file
 * @param outputFilename output file name
 * @param imagePoints image points for each view
 * @param imageSize image size
 * @param boardSize board size (in inner corner numbers)
 * @param squareSize board square size
 * @param aspectRatio aspect ratio
 * @param flags CV calibration flags
 * @param cameraMatrix camera calibration matrix
 * @param distCoeffs distorsion coefficients
 * @param writeExtrinsics Also write extrinsic parameters to file
 * @param writePoints Also write points to file
 * @return true if calibration have been performed and results saved to file,
 * false otherwise
 */
bool runAndSave(const string & outputFilename,
				const vector<vector<Point2f> > & imagePoints,
				Size imageSize,
				Size boardSize,
				float squareSize,
				float aspectRatio,
				int flags,
				Mat & cameraMatrix,
				Mat & distCoeffs,
				bool writeExtrinsics,
				bool writePoints)
{
	vector<Mat> rvecs, tvecs;
	vector<float> reprojErrs;
	double totalAvgErr = 0;

	bool ok = runCalibration(imagePoints,
							 imageSize,
							 boardSize,
							 squareSize,
							 aspectRatio,
							 flags,
							 cameraMatrix,
							 distCoeffs,
							 rvecs,
							 tvecs,
							 reprojErrs,
							 totalAvgErr);
	printf("%s. avg reprojection error = %.2f\n",
		   ok ? "Calibration succeeded" : "Calibration failed",
		   totalAvgErr);

	if (ok)
	{
		saveCameraParams(outputFilename,
						 imageSize,
						 boardSize,
						 squareSize,
						 aspectRatio,
						 flags,
						 cameraMatrix,
						 distCoeffs,
						 writeExtrinsics ? rvecs : vector<Mat>(),
						 writeExtrinsics ? tvecs : vector<Mat>(),
						 writeExtrinsics ? reprojErrs : vector<float>(),
						 writePoints ? imagePoints : vector<vector<Point2f> >(),
						 totalAvgErr);
	}
	return ok;
}

/**
 * Calibration Main program
 * @param argc argument count
 * @param argv arguments values
 * @return 0 if arguments are missing or if everything went right. return -1
 * in all error cases
 */
int main(int argc, char ** argv)
{
	Size boardSize, imageSize;
	float squareSize = 1.f, aspectRatio = 1.f;
	Mat cameraMatrix, distCoeffs;
	const char * outputFilename = "out_camera_data.yml";
	const char * inputFilename = 0;

	int i, nframes = 10;
	bool writeExtrinsics = false, writePoints = false;
	bool undistortImage = false;
	int flags = 0;
	VideoCapture capture;
	bool flipVertical = false;
	bool showUndistorted = false;
	bool videofile = false;
	int delay = 1000;
	clock_t prevTimestamp = 0;
	CalibState mode = DETECTION;
	int cameraId = 0;
	int reduceFactor = 1;
	vector<vector<Point2f> > imagePoints;
	vector<string> imageList;
	bool manualTrigger = false;
	int key;

	if (argc < 2)
	{
		help();
		return 0;
	}

	for (i = 1; i < argc; i++)
	{
		const char * s = argv[i];
		if (strcmp(s, "-w") == 0)
		{
			if (sscanf(argv[++i], "%u", &boardSize.width) != 1 ||
				boardSize.width <= 0)
			{
				return fprintf(stderr, "Invalid board width\n"), -1;
			}
		}
		else if (strcmp(s, "-h") == 0)
		{
			if (sscanf(argv[++i], "%u", &boardSize.height) != 1 ||
				boardSize.height <= 0)
			{
				return fprintf(stderr, "Invalid board height\n"), -1;
			}
		}
		else if (strcmp(s, "-s") == 0)
		{
			if (sscanf(argv[++i], "%f", &squareSize) != 1 || squareSize <= 0)
			{
				return fprintf(stderr, "Invalid board square width\n"), -1;
			}
		}
		else if (strcmp(s, "-n") == 0)
		{
			if (sscanf(argv[++i], "%u", &nframes) != 1 || nframes <= 3)
			{
				return printf("Invalid number of images\n"), -1;
			}
		}
		else if (strcmp(s, "-a") == 0)
		{
			if (sscanf(argv[++i], "%f", &aspectRatio) != 1 || aspectRatio <= 0)
			{
				return printf("Invalid aspect ratio\n"), -1;
			}
			flags |= CV_CALIB_FIX_ASPECT_RATIO;
		}
		else if (strcmp(s, "-d") == 0)
		{
			if (sscanf(argv[++i], "%u", &delay) != 1 || delay <= 0)
			{
				return printf("Invalid delay\n"), -1;
			}
		}
		else if (strcmp(s, "-op") == 0)
		{
			writePoints = true;
		}
		else if (strcmp(s, "-oe") == 0)
		{
			writeExtrinsics = true;
		}
		else if (strcmp(s, "-zt") == 0)
		{
			flags |= CV_CALIB_ZERO_TANGENT_DIST;
		}
		else if (strcmp(s, "-p") == 0)
		{
			flags |= CV_CALIB_FIX_PRINCIPAL_POINT;
		}
		else if (strcmp(s, "-v") == 0)
		{
			flipVertical = true;
		}
		else if (strcmp(s, "-V") == 0)
		{
			videofile = true;
		}
		else if (strcmp(s, "-o") == 0)
		{
			outputFilename = argv[++i];
		}
		else if (strcmp(s, "-su") == 0)
		{
			showUndistorted = true;
		}
		else if (strcmp(s, "--device") == 0)
		{
			sscanf(argv[++i], "%d", &cameraId);
			printf("Scanned camera Id  = %d\n", cameraId);
			if (cameraId < 0)
			{
				fprintf(stderr, "wrong camera Id : %d\n", cameraId);
				cameraId = 0;
			}
		}
		else if (strcmp(s, "--reduce") == 0)
		{
			sscanf(argv[++i], "%d", &reduceFactor);
			if (reduceFactor <= 0)
			{
				fprintf(stderr, "wrong reduce factor 1/%d\n", reduceFactor);
				reduceFactor = 1;
			}
		}
		// Scan all arguments not starting with -
		else if (s[0] != '-')
		{
			if (isdigit(s[0]))
			{
				sscanf(s, "%d", &cameraId);
			}
			else
			{
				inputFilename = s;
			}
		}
		else if ((strcmp(s, "-m") == 0) || (strcmp(s, "--manual") == 0))
		{
			manualTrigger = true;
		}
		else
		{
			return fprintf(stderr, "Unknown option %s", s), -1;
		}
	}

	printf("Required camera Id is %d\n", cameraId);

	if (inputFilename)
	{
		if (!videofile && readStringList(inputFilename, imageList))
		{
			mode = CAPTURING;
		}
		else
		{
			capture.open(inputFilename);
		}
	}
	else
	{
		capture.open(cameraId);
	}

	if (!capture.isOpened() && imageList.empty())
	{
		return fprintf(stderr, "Could not initialize video capture\n"), -2;
	}

	if (!imageList.empty())
	{
		nframes = (int) imageList.size();
	}

	if (capture.isOpened())
	{
		printf("%s", liveCaptureHelp);
	}

	namedWindow("Image View", CV_WINDOW_AUTOSIZE | CV_GUI_NORMAL);

	for (i = 0;; i++)
	{
		Mat view, viewGray;
		bool blink = false;

		if (capture.isOpened())
		{
			Mat view0;
			capture >> view0;
			if (reduceFactor != 1)
			{
				resize(
					view0,
					view,
					Size(view0.cols / reduceFactor, view0.rows / reduceFactor),
					0,
					0,
					INTER_AREA);
			}
			else
			{
				view0.copyTo(view);
			}
		}
		else if (i < (int) imageList.size())
		{
			view = imread(imageList[i], 1);
		}

		if (!view.data)
		{
			if (imagePoints.size() > 0)
			{
				runAndSave(outputFilename,
						   imagePoints,
						   imageSize,
						   boardSize,
						   squareSize,
						   aspectRatio,
						   flags,
						   cameraMatrix,
						   distCoeffs,
						   writeExtrinsics,
						   writePoints);
			}
			break;
		}

		imageSize = view.size();

		if (flipVertical)
		{
			flip(view, view, 0);
		}

		vector<Point2f> pointbuf;
		cvtColor(view, viewGray, CV_BGR2GRAY);

		bool found = findChessboardCorners(view,
										   boardSize,
										   pointbuf,
										   CV_CALIB_CB_ADAPTIVE_THRESH &
										   CV_CALIB_CB_FAST_CHECK &
										   CV_CALIB_CB_NORMALIZE_IMAGE);

		// improve the found corners' coordinate accuracy
		if (found)
		{
			cornerSubPix(viewGray,
						 pointbuf,
						 Size(11, 11),
						 Size(-1, -1),
						 TermCriteria(CV_TERMCRIT_EPS + CV_TERMCRIT_ITER,
									  30,
									  0.1));
		}

		bool trigger;
		if (manualTrigger)
		{
			trigger = (key == 'c');
		}
		else
		{
			trigger = clock() - prevTimestamp > delay * 1e-3 * CLOCKS_PER_SEC;
		}

		if (mode == CAPTURING &&
			found &&
			(!capture.isOpened() ||
			 trigger))
		{
			imagePoints.push_back(pointbuf);
			prevTimestamp = clock();
			blink = capture.isOpened();
		}

		if (found)
		{
			drawChessboardCorners(view, boardSize, Mat(pointbuf), found);
		}

		string msg = mode == CAPTURING ?
					"100/100" :
					mode == CALIBRATED ? "Calibrated" : "Press 'g' to start";
		int baseLine = 0;
		Size textSize = getTextSize(msg, 1, 1, 1, &baseLine);
		Point textOrigin(view.cols - 2 * textSize.width - 10,
						 view.rows - 2 * baseLine - 10);

		if (mode == CAPTURING)
		{
			if (undistortImage)
			{
				msg = format("%d/%d Undist", (int) imagePoints.size(), nframes);
			}
			else
			{
				msg = format("%d/%d", (int) imagePoints.size(), nframes);
			}
		}

		putText(view,
				msg,
				textOrigin,
				1,
				1,
				mode != CALIBRATED ? Scalar(0, 0, 255) : Scalar(0, 255, 0));

		if (blink)
		{
			bitwise_not(view, view);
		}

		if (mode == CALIBRATED && undistortImage)
		{
			Mat temp = view.clone();
			undistort(temp, view, cameraMatrix, distCoeffs);
		}

		imshow("Image View", view);
		key = 0xff & waitKey(capture.isOpened() ? 50 : 500);

		if ((key & 255) == 27)
		{
			break;
		}

		if (key == 'u' && mode == CALIBRATED)
		{
			undistortImage = !undistortImage;
		}

		if (capture.isOpened() && key == 'g')
		{
			mode = CAPTURING;
			imagePoints.clear();
		}

		if (mode == CAPTURING && imagePoints.size() >= (unsigned) nframes)
		{
			if (runAndSave(outputFilename,
						   imagePoints,
						   imageSize,
						   boardSize,
						   squareSize,
						   aspectRatio,
						   flags,
						   cameraMatrix,
						   distCoeffs,
						   writeExtrinsics,
						   writePoints))
			{
				mode = CALIBRATED;
			}
			else
			{
				mode = DETECTION;
			}
			if (!capture.isOpened())
			{
				break;
			}
		}
	}

	if (!capture.isOpened() && showUndistorted)
	{
		Mat view, rview, map1, map2;
		initUndistortRectifyMap(cameraMatrix,
								distCoeffs,
								Mat(),
								getOptimalNewCameraMatrix(cameraMatrix,
														  distCoeffs,
														  imageSize,
														  1,
														  imageSize,
														  0),
								imageSize,
								CV_16SC2,
								map1,
								map2);

		for (i = 0; i < (int) imageList.size(); i++)
		{
			view = imread(imageList[i], 1);
			if (!view.data)
			{
				continue;
			}
			// undistort( view, rview, cameraMatrix, distCoeffs, cameraMatrix );
			remap(view, rview, map1, map2, INTER_LINEAR);
			imshow("Image View", rview);
			int c = 0xff & waitKey();
			if ((c & 255) == 27 || c == 'q' || c == 'Q')
			{
				break;
			}
		}
	}

	return 0;
}
