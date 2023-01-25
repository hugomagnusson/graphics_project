#version 410

struct ViewProjTransforms
{
	mat4 view_projection;
	mat4 view_projection_inverse;
};

layout (std140) uniform CameraViewProjTransforms
{
	ViewProjTransforms camera;
};

layout (std140) uniform LightViewProjTransforms
{
	ViewProjTransforms lights[4];
};

uniform int light_index;

uniform sampler2D depth_texture;
uniform sampler2D normal_texture;
uniform sampler2D shadow_texture;

uniform vec2 inverse_screen_resolution;

uniform vec3 camera_position;

uniform vec3 light_color;
uniform vec3 light_position;
uniform vec3 light_direction;
uniform float light_intensity;
uniform float light_angle_falloff;


layout (location = 0) out vec4 light_diffuse_contribution;
layout (location = 1) out vec4 light_specular_contribution;


void main()
{
	float pi = 3.1415926;

	vec2 texcoord = inverse_screen_resolution*gl_FragCoord.xy;
	vec4 depth = texture(depth_texture, texcoord);


	vec4 world_position = camera.view_projection_inverse*vec4(texcoord*2-1,2*depth.x-1,1.0);
	world_position /= world_position.w;
	vec4 N = texture(normal_texture, texcoord) * 2 - 1;
	vec3 V = normalize(camera_position - world_position.xyz);
	vec3 light_vec = light_position - world_position.xyz;
	vec3 L = normalize(light_vec);

	float spec_val = 0.5f;

	vec2 shadowmap_texel_size = 1.0f / textureSize(shadow_texture, 0);

	float diff = max(dot(N.xyz, L), 0.0);
	float spec = pow(max(dot(V, reflect(-L, N.xyz)), 0.0), 10.0);

	vec3 diffuse = diff * light_color;
	vec3 specular = spec_val * spec * light_color;

	float light_falloff = dot(light_position-world_position.xyz, light_position-world_position.xyz);
	float angle_falloff = max((light_angle_falloff - acos(dot(-L, normalize(light_direction)))), 0.0)/light_angle_falloff;
	float it = light_intensity*angle_falloff/light_falloff;

	float visibility = 1.0;
	vec4 light_pos = lights[light_index].view_projection * world_position;
	light_pos /= light_pos.w;
	vec3 shadow_coords = light_pos.xyz * 0.5 + 0.5;
	for (int i = -2;i<3;i++){
		for(int j = -2; j<3; j++){
			vec4 shadow_dist = texture(shadow_texture, vec2(shadow_coords.x + shadowmap_texel_size.x * i, shadow_coords.y + shadowmap_texel_size.y * j)) + 0.0001;
			if (shadow_dist.x < shadow_coords.z) {
				visibility -= 1.0/25.0;
			}
		}
	}
	

	light_diffuse_contribution  = vec4(diff * visibility * it * light_color, 0);
	light_specular_contribution = vec4(spec_val * visibility * it * spec  * light_color, 0);
}
